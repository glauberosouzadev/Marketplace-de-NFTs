import { describe, expect, it } from 'vitest'
import type { ApiError } from '@/contracts'
import { createQueryClient, shouldRetry } from './query-client'
import { queryKeys } from './query-keys'

const err = (kind: ApiError['kind'], status?: number): ApiError => ({
  kind,
  code: 'TRANSIENT',
  message: 'x',
  ...(status === undefined ? {} : { status }),
})

describe('retry', () => {
  it('nunca refaz 4xx nem cancelamento', () => {
    expect(shouldRetry(0, err('http', 404))).toBe(false)
    expect(shouldRetry(0, err('http', 422))).toBe(false)
    expect(shouldRetry(0, err('canceled'))).toBe(false)
  })
  it('refaz rede, timeout e 5xx até o limite', () => {
    expect(shouldRetry(0, err('network'))).toBe(true)
    expect(shouldRetry(1, err('timeout'))).toBe(true)
    expect(shouldRetry(1, err('http', 503))).toBe(true)
    expect(shouldRetry(2, err('http', 503))).toBe(false)
  })
  it('defaults: mutations sem retry e refetch ligado', () => {
    const d = createQueryClient().getDefaultOptions()
    expect(d.mutations?.retry).toBe(0)
    expect(d.queries?.refetchOnWindowFocus).toBe(true)
    expect(d.queries?.refetchOnReconnect).toBe(true)
  })
})

describe('query-keys', () => {
  it('chaves privadas carregam uid/escopo', () => {
    expect(queryKeys.favorites('u1')).toEqual(['user', 'u1', 'favorites'])
    expect(queryKeys.cart(['guest', 'c1'])).toEqual(['guest', 'c1', 'cart'])
    expect(queryKeys.quote(['user', 'u1'], 2, null, 'polygon')).toEqual([
      'user',
      'u1',
      'quote',
      2,
      null,
      'polygon',
    ])
    expect(queryKeys.order('u1', 'o1')).toEqual(['user', 'u1', 'order', 'o1'])
    expect(queryKeys.wallets('u1')[1]).toBe('u1')
  })
})
