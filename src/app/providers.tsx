import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  PrivateStateCleanerProvider,
  createSessionTeardown,
} from '@/features/session/clear-private-state'
import { setSessionExpiredHandler } from '@/http/client'
import { clearSession, clearUserStorage } from '@/lib/storage'
import { noticeBus } from '@/realtime/notices'
import { queryClient } from './query-client'
import { router } from './router'

const sessionTeardown = createSessionTeardown({
  // Import dinâmico: o socket só pode carregar depois do start dos mocks (SDD-13).
  restartRealtime: async () => (await import('@/realtime/socket')).restartRealtime(),
  queryClient,
  clearSession,
  clearUserStorage,
  navigate: (href) => router.navigate({ href, replace: true }),
  publishNotice: noticeBus.publish,
  dismissNotice: noticeBus.dismiss,
})

setSessionExpiredHandler(() => void sessionTeardown.expireSession(router.state.location.href))

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivateStateCleanerProvider value={sessionTeardown.clearPrivateState}>
        {children}
      </PrivateStateCleanerProvider>
    </QueryClientProvider>
  )
}
