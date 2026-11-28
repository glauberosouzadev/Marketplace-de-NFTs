export type ConnectionPhase =
  'idle' | 'connecting' | 'connected' | 'rejected' | 'disconnected' | 'failed'

export interface ConnectionState {
  phase: ConnectionPhase
  /** Mensagem da falha de rede/servidor (`failed`). */
  error?: string
}

export type ConnectionEvent =
  | { type: 'START' }
  | { type: 'CONNECTED' }
  | { type: 'REJECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'FAILED'; error: string }
  | { type: 'RESET' }

export const IDLE: ConnectionState = { phase: 'idle' }

/** Uma conexão já registrada no contexto restaurado vale como conectada; o servidor revalida no envio. */
export const initialConnection = (connectionId: string | undefined): ConnectionState =>
  connectionId ? { phase: 'connected' } : IDLE

export function connectionReducer(state: ConnectionState, event: ConnectionEvent): ConnectionState {
  switch (event.type) {
    case 'START':
      return state.phase === 'connecting' ? state : { phase: 'connecting' }
    case 'CONNECTED':
      return state.phase === 'connecting' ? { phase: 'connected' } : state
    case 'REJECTED':
      return state.phase === 'connecting' ? { phase: 'rejected' } : state
    case 'FAILED':
      return { phase: 'failed', error: event.error }
    case 'DISCONNECTED':
      return { phase: 'disconnected' }
    case 'RESET':
      return state.phase === 'idle' ? state : IDLE
  }
}

export const PHASE_LABEL: Record<ConnectionPhase, string> = {
  idle: 'Não conectada',
  connecting: 'Conectando…',
  connected: 'Conectada',
  rejected: 'Recusada',
  disconnected: 'Desconectada',
  failed: 'Falha na conexão',
}

const BLOCK_MESSAGE: Record<Exclude<ConnectionPhase, 'connected' | 'failed'>, string> = {
  idle: 'Conecte sua carteira para confirmar a compra.',
  connecting: 'Aguarde a conexão da carteira terminar.',
  rejected: 'A carteira recusou a conexão. Tente novamente ou escolha outro provedor.',
  disconnected: 'A carteira foi desconectada. Conecte-a novamente para confirmar a compra.',
}

/** FR-29: só `connected` libera o envio; recusa, desconexão e falha bloqueiam com texto. */
export function blockMessage(state: ConnectionState): string | null {
  if (state.phase === 'connected') return null
  return state.phase === 'failed' ? (state.error ?? PHASE_LABEL.failed) : BLOCK_MESSAGE[state.phase]
}

/** Recusa, desconexão e falha aparecem de imediato; os demais só após tentar confirmar. */
export const isFailure = (state: ConnectionState): boolean =>
  state.phase === 'rejected' || state.phase === 'disconnected' || state.phase === 'failed'
