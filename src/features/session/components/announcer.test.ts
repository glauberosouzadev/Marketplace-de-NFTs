import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnnouncer } from './announcer'

describe('createAnnouncer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('limpa e repõe o mesmo texto a cada chamada, para reanunciar', () => {
    const history: string[] = []
    const { announce } = createAnnouncer((t) => history.push(t))
    announce('aviso')
    vi.advanceTimersByTime(50)
    announce('aviso')
    vi.advanceTimersByTime(50)
    expect(history).toEqual(['', 'aviso', '', 'aviso'])
  })

  it('chamadas seguidas antes do tick anunciam uma só vez', () => {
    const history: string[] = []
    const { announce } = createAnnouncer((t) => history.push(t))
    announce('a')
    announce('b')
    vi.advanceTimersByTime(50)
    expect(history).toEqual(['', '', 'b'])
  })
})
