import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, request } from './client'

const store = new Map<string, string>()
let seen: InternalAxiosRequestConfig | undefined

const ok = (c: InternalAxiosRequestConfig) =>
  Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: c })

function useAdapter(a: AxiosAdapter): void {
  http.defaults.adapter = (c) => {
    seen = c
    return a(c)
  }
}

beforeEach(() => {
  store.clear()
  seen = undefined
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  })
})
afterEach(() => vi.useRealTimers())

describe('cabeçalhos', () => {
  it('sem sessão envia X-Guest-Cart-Id só em /cart e /quotes', async () => {
    useAdapter(ok)
    await request({ url: '/cart' })
    expect(seen?.headers.get('X-Guest-Cart-Id')).toBeTruthy()
    await request({ url: '/quotes' })
    expect(seen?.headers.get('X-Guest-Cart-Id')).toBeTruthy()
    await request({ url: '/nfts' })
    expect(seen?.headers.get('X-Guest-Cart-Id')).toBeUndefined()
    expect(seen?.headers.get('Authorization')).toBeUndefined()
  })
  it('com sessão envia Authorization e não o guest id', async () => {
    store.set('kurio:session', JSON.stringify({ token: 't1', uid: 'u1' }))
    useAdapter(ok)
    await request({ url: '/cart' })
    expect(seen?.headers.get('Authorization')).toBe('Bearer t1')
    expect(seen?.headers.get('X-Guest-Cart-Id')).toBeUndefined()
  })
})

describe('erros', () => {
  it('4xx preserva code e fieldErrors', async () => {
    useAdapter((c) =>
      Promise.reject(
        new AxiosError('bad', 'ERR_BAD_REQUEST', c, null, {
          data: { code: 'VALIDATION', message: 'm', fieldErrors: { email: 'x' } },
          status: 422,
          statusText: '',
          headers: {},
          config: c,
        }),
      ),
    )
    await expect(request({ url: '/x' })).rejects.toMatchObject({
      kind: 'http',
      status: 422,
      code: 'VALIDATION',
      fieldErrors: { email: 'x' },
    })
  })
  it('5xx e rede viram TRANSIENT', async () => {
    useAdapter((c) =>
      Promise.reject(
        new AxiosError('b', 'ERR_BAD_RESPONSE', c, null, {
          data: {},
          status: 503,
          statusText: '',
          headers: {},
          config: c,
        }),
      ),
    )
    await expect(request({ url: '/x' })).rejects.toMatchObject({ code: 'TRANSIENT', status: 503 })
    useAdapter((c) => Promise.reject(new AxiosError('n', 'ERR_NETWORK', c)))
    await expect(request({ url: '/x' })).rejects.toMatchObject({
      kind: 'network',
      code: 'TRANSIENT',
    })
  })
  const hang = (c: InternalAxiosRequestConfig): Promise<never> =>
    new Promise((_, reject) => {
      c.signal?.addEventListener?.('abort', () => reject(new AxiosError('c', 'ERR_CANCELED', c)))
    })
  it('timeout por setTimeout (relógio falso) vira kind timeout', async () => {
    vi.useFakeTimers()
    useAdapter(hang)
    const p = request({ url: '/x' })
    const assertion = expect(p).rejects.toMatchObject({ kind: 'timeout', code: 'TRANSIENT' })
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })
  it('abort do chamador vira canceled', async () => {
    useAdapter(hang)
    const ctrl = new AbortController()
    const p = request({ url: '/x', signal: ctrl.signal })
    ctrl.abort()
    await expect(p).rejects.toMatchObject({ kind: 'canceled' })
  })
})
