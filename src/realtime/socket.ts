import { io, type Socket } from 'socket.io-client'
import { env } from '@/app/env'
import type { KurioEvent, KurioEventType } from '@/contracts'
import { getSession } from '@/lib/storage'
import { connectionStatus, type ConnectionStatus } from './connection-status'

type EventListener = (event: KurioEvent) => void

const EVENT_TYPES: KurioEventType[] = ['nft.updated', 'order.updated']
const listeners = new Set<EventListener>()
let socket: Socket | null = null
let currentToken: string | null = null

function create(token: string | null): Socket {
  const client = io(env.wsUrl, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    ...(token ? { auth: { token } } : {}),
  })
  client.on('connect', () => connectionStatus.set('connected'))
  client.on('disconnect', () => connectionStatus.set('reconnecting'))
  client.on('connect_error', () => connectionStatus.set('reconnecting'))
  EVENT_TYPES.forEach((type) =>
    client.on(type, (event: KurioEvent) => listeners.forEach((listener) => listener(event))),
  )
  return client
}

function connectRealtime(token: string | null): void {
  if (socket && token === currentToken) return
  socket?.disconnect()
  currentToken = token
  socket = create(token)
  connectionStatus.set('connecting')
  socket.connect()
}

export function connectPersistedRealtime(): void {
  connectRealtime(getSession()?.token ?? null)
}

export function onRealtimeEvent(listener: EventListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

interface RealtimeProbe {
  status: () => ConnectionStatus
  onEvent: typeof onRealtimeEvent
}

declare global {
  interface Window {
    __kurioRealtime?: RealtimeProbe
  }
}

// Sem UI de tempo real ainda, o E2E do spike observa o socket por aqui (só com mocks).
export function exposeRealtimeForTests(): void {
  window.__kurioRealtime = { status: connectionStatus.get, onEvent: onRealtimeEvent }
}
