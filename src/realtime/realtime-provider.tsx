import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { KurioEvent } from '@/contracts'
import type { ConnectionListener } from './connection-status'
import type { RealtimeSync, RestObserver } from './realtime-sync'

export type SubscribeToEvents = (listener: (event: KurioEvent) => void) => () => void

export type SubscribeToConnection = (listener: ConnectionListener) => () => void

const RestObserverContext = createContext<RestObserver | null>(null)

interface RealtimeProviderProps {
  sync: RealtimeSync
  subscribe: SubscribeToEvents
  subscribeToConnection: SubscribeToConnection
  onConnectionChange: ConnectionListener
  children: ReactNode
}

export function RealtimeProvider({
  sync,
  subscribe,
  subscribeToConnection,
  onConnectionChange,
  children,
}: RealtimeProviderProps) {
  useEffect(() => subscribe(sync.handle), [sync, subscribe])
  useEffect(
    () => subscribeToConnection(onConnectionChange),
    [subscribeToConnection, onConnectionChange],
  )
  return <RestObserverContext.Provider value={sync}>{children}</RestObserverContext.Provider>
}

export function useRestObserver(): RestObserver {
  const observer = useContext(RestObserverContext)
  if (!observer) throw new Error('RealtimeProvider ausente')
  return observer
}
