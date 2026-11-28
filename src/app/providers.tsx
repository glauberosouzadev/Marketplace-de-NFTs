import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { currentCartScope } from '@/features/cart/mutations'
import {
  PrivateStateCleanerProvider,
  createSessionTeardown,
} from '@/features/session/clear-private-state'
import { useSession } from '@/features/session/queries'
import { setSessionExpiredHandler } from '@/http/client'
import { clearSession, clearUserStorage } from '@/lib/storage'
import { createConnectionNotices } from '@/realtime/connection-notices'
import { connectionStatus } from '@/realtime/connection-status'
import { noticeBus } from '@/realtime/notices'
import { refetchActiveResources } from '@/realtime/refetch-active'
import {
  RealtimeProvider,
  type SubscribeToConnection,
  type SubscribeToEvents,
} from '@/realtime/realtime-provider'
import { createRealtimeSync } from '@/realtime/realtime-sync'
import { queryClient } from './query-client'
import { router } from './router'

// Import dinâmico: o socket só pode carregar depois do start dos mocks (SDD-13).
const loadSocket = () => import('@/realtime/socket')

const realtimeSync = createRealtimeSync({
  queryClient,
  notices: noticeBus,
  getScope: currentCartScope,
})

const subscribeToEvents: SubscribeToEvents = (listener) => {
  let unsubscribe: (() => void) | null = null
  let active = true
  void loadSocket().then(({ onRealtimeEvent }) => {
    if (active) unsubscribe = onRealtimeEvent(listener)
  })
  return () => {
    active = false
    unsubscribe?.()
  }
}

const connectionNotices = createConnectionNotices({
  notices: noticeBus,
  onReconnected: () => void refetchActiveResources(queryClient, currentCartScope()),
})

const subscribeToConnection: SubscribeToConnection = (listener) => {
  const unsubscribe = connectionStatus.subscribe(listener)
  return () => {
    unsubscribe()
    connectionNotices.dispose()
  }
}

const sessionTeardown = createSessionTeardown({
  restartRealtime: async () => (await loadSocket()).restartRealtime(),
  resetEventDedupe: realtimeSync.reset,
  queryClient,
  clearSession,
  clearUserStorage,
  navigate: (href) => router.navigate({ href, replace: true }),
  publishNotice: noticeBus.publish,
  dismissNotice: noticeBus.dismiss,
})

setSessionExpiredHandler(() => void sessionTeardown.expireSession(router.state.location.href))

/** Login troca o escopo sem passar pelo teardown: reconecta com o token novo (SDD-09). */
function RealtimeSessionScope() {
  const uid = useSession().data?.id ?? null
  useEffect(() => {
    void loadSocket().then(({ connectPersistedRealtime }) => connectPersistedRealtime())
  }, [uid])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider
        sync={realtimeSync}
        subscribe={subscribeToEvents}
        subscribeToConnection={subscribeToConnection}
        onConnectionChange={connectionNotices.listener}
      >
        <PrivateStateCleanerProvider value={sessionTeardown.clearPrivateState}>
          <RealtimeSessionScope />
          {children}
        </PrivateStateCleanerProvider>
      </RealtimeProvider>
    </QueryClientProvider>
  )
}
