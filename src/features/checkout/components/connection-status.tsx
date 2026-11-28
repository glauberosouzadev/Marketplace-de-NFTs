import { Button } from '@/ui/button'
import { PHASE_LABEL, blockMessage, isFailure, type ConnectionState } from '../wallet-connection'

interface ConnectionStatusProps {
  state: ConnectionState
  /** Há carteira, provedor e rede escolhidos. */
  canConnect: boolean
  /** O usuário já tentou confirmar a compra: o bloqueio passa a ser explicado. */
  attempted: boolean
  onConnect: () => void
  onDisconnect: () => void
}

/** Estado nunca só por cor: texto na região `status`; o bloqueio vai em `alert`. */
export function ConnectionStatus({
  state,
  canConnect,
  attempted,
  onConnect,
  onDisconnect,
}: ConnectionStatusProps) {
  const connecting = state.phase === 'connecting'
  const message = isFailure(state) || attempted ? blockMessage(state) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm">
          Conexão: <strong>{PHASE_LABEL[state.phase]}</strong>
        </p>
        {state.phase === 'connected' ? (
          <Button type="button" variant="outline" size="sm" onClick={onDisconnect}>
            Desconectar
          </Button>
        ) : (
          <Button
            type="button"
            variant="dim"
            size="sm"
            disabled={!canConnect || connecting}
            onClick={onConnect}
          >
            {isFailure(state) ? 'Tentar novamente' : 'Conectar carteira'}
          </Button>
        )}
      </div>
      <p role="alert" className="text-destructive text-sm empty:hidden">
        {message}
      </p>
    </div>
  )
}
