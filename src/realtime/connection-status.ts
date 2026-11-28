export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

export type ConnectionListener = (next: ConnectionStatus, previous: ConnectionStatus) => void

let status: ConnectionStatus = 'idle'
const listeners = new Set<ConnectionListener>()

export const connectionStatus = {
  get: (): ConnectionStatus => status,
  set: (next: ConnectionStatus): void => {
    if (next === status) return
    const previous = status
    status = next
    listeners.forEach((listener) => listener(next, previous))
  },
  subscribe(listener: ConnectionListener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
