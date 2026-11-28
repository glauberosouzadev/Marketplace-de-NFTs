import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ConnectionState } from '../wallet-connection'
import { ConnectionStatus } from './connection-status'

const render = (state: ConnectionState, attempted = false): string =>
  renderToStaticMarkup(
    <ConnectionStatus
      state={state}
      canConnect
      attempted={attempted}
      onConnect={() => undefined}
      onDisconnect={() => undefined}
    />,
  )

describe('ConnectionStatus', () => {
  it('cada estado aparece em texto na região status', () => {
    expect(render({ phase: 'connecting' })).toMatch(
      /role="status"[^>]*>Conexão: <strong>Conectando…/,
    )
    expect(render({ phase: 'connected' })).toContain('Conectada')
    expect(render({ phase: 'rejected' })).toContain('Recusada')
    expect(render({ phase: 'disconnected' })).toContain('Desconectada')
  })

  it('recusa e desconexão mostram o bloqueio de imediato em alert', () => {
    expect(render({ phase: 'rejected' })).toMatch(/role="alert"[^>]*>A carteira recusou/)
    expect(render({ phase: 'disconnected' })).toMatch(
      /role="alert"[^>]*>A carteira foi desconectada/,
    )
  })

  it('não conectada só explica o bloqueio depois de tentar confirmar', () => {
    expect(render({ phase: 'idle' })).toMatch(/role="alert"[^>]*><\/p>/)
    expect(render({ phase: 'idle' }, true)).toContain('Conecte sua carteira')
  })

  it('conectada oferece desconectar; conectando desabilita conectar', () => {
    expect(render({ phase: 'connected' })).toContain('Desconectar')
    expect(render({ phase: 'connecting' })).toMatch(/disabled=""[^>]*>Conectar carteira/)
  })
})
