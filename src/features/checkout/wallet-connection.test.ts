import { describe, expect, it } from 'vitest'
import {
  IDLE,
  blockMessage,
  connectionReducer,
  initialConnection,
  isFailure,
  type ConnectionEvent,
  type ConnectionState,
} from './wallet-connection'

const run = (events: ConnectionEvent[], from: ConnectionState = IDLE): ConnectionState =>
  events.reduce(connectionReducer, from)

describe('connectionReducer', () => {
  it('conectar passa por conectando e termina conectada', () => {
    expect(run([{ type: 'START' }]).phase).toBe('connecting')
    expect(run([{ type: 'START' }, { type: 'CONNECTED' }]).phase).toBe('connected')
  })

  it('recusa termina em recusada e bloqueia com texto', () => {
    const state = run([{ type: 'START' }, { type: 'REJECTED' }])
    expect(state.phase).toBe('rejected')
    expect(blockMessage(state)).toMatch(/recusou a conexão/)
    expect(isFailure(state)).toBe(true)
  })

  it('desconexão vale a partir de conectada e bloqueia', () => {
    const state = run([{ type: 'DISCONNECTED' }], { phase: 'connected' })
    expect(state.phase).toBe('disconnected')
    expect(blockMessage(state)).toMatch(/desconectada/)
  })

  it('resultado fora de uma tentativa em curso é ignorado', () => {
    expect(run([{ type: 'CONNECTED' }]).phase).toBe('idle')
    expect(run([{ type: 'REJECTED' }]).phase).toBe('idle')
  })

  it('falha guarda a mensagem e RESET volta a não conectada', () => {
    const failed = run([{ type: 'START' }, { type: 'FAILED', error: 'Algo deu errado.' }])
    expect(blockMessage(failed)).toBe('Algo deu errado.')
    expect(run([{ type: 'RESET' }], failed)).toEqual(IDLE)
  })

  it('só conectada libera o envio', () => {
    expect(blockMessage({ phase: 'connected' })).toBeNull()
    expect(blockMessage(IDLE)).not.toBeNull()
    expect(blockMessage({ phase: 'connecting' })).not.toBeNull()
  })

  it('contexto restaurado com conexão começa conectada', () => {
    expect(initialConnection('c1').phase).toBe('connected')
    expect(initialConnection(undefined)).toEqual(IDLE)
  })
})
