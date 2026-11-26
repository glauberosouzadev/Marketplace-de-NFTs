export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

let status: ConnectionStatus = 'idle'

export const connectionStatus = {
  get: (): ConnectionStatus => status,
  set: (next: ConnectionStatus): void => {
    status = next
  },
}
