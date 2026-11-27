import { MutationObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { ApiError, AuthResponse, Cart, CartAdjustment, User } from '@/contracts'
import { noticeBus } from '@/realtime/notices'

const request = vi.fn<(c: { url?: string; data?: unknown }) => Promise<unknown>>()
vi.mock('@/http/client', () => ({
  request: (c: { url?: string; data?: unknown }) => request(c),
}))

import { loginMutation, logoutMutation, registerMutation } from './mutations'

const store = new Map<string, string>()
const user: User = {
  id: 'u-1',
  username: 'ana',
  email: 'a@k.io',
  displayName: 'Ana',
  ensName: 'ana.eth',
  version: 1,
}
const cart: Cart = { id: 'c1', owner: 'user:u-1', items: [], version: 1 }
const authResponse = (cartAdjustments: CartAdjustment[] = []): AuthResponse => ({
  session: { token: 'tok-1', expiresAt: '2026-12-01T00:00:00Z' },
  user,
  cartAdjustments,
})
const networkError: ApiError = { kind: 'network', code: 'TRANSIENT', message: 'rede' }

beforeEach(() => {
  request.mockReset()
  noticeBus.clear()
  store.clear()
  store.set('kurio:guestCartId', 'g-1')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size
      },
    },
  })
})

describe.each([
  ['login', loginMutation, { email: 'a@k.io', password: 's3gredo' }],
  ['cadastro', registerMutation, { username: 'ana', email: 'a@k.io', password: 's3gredo' }],
] as const)('%s', (_label, factory, input) => {
  function setup() {
    const client = createQueryClient()
    client.setQueryData(queryKeys.cart(['user', 'u-1']), cart)
    const observer = new MutationObserver(client, factory(client) as never)
    return { client, observer }
  }

  it('envia guestCartId, grava só {token, uid}, descarta o id e invalida o carrinho', async () => {
    request.mockResolvedValue(authResponse())
    const { client, observer } = setup()
    await observer.mutate(input as never)
    expect(request.mock.calls[0]?.[0].data).toEqual({ ...input, guestCartId: 'g-1' })
    expect(JSON.parse(store.get('kurio:session') ?? '')).toEqual({ token: 'tok-1', uid: 'u-1' })
    expect(store.has('kurio:guestCartId')).toBe(false)
    expect(client.getQueryData(queryKeys.session())).toEqual(user)
    expect(client.getQueryState(queryKeys.cart(['user', 'u-1']))?.isInvalidated).toBe(true)
  })

  it('descarta o cache do visitante e o contexto de outros usuários', async () => {
    request.mockResolvedValue(authResponse())
    store.set('kurio:u:u-0:checkout', '{}')
    store.set('kurio:u:u-1:checkout', '{}')
    const { client, observer } = setup()
    client.setQueryData(queryKeys.cart(['guest', 'g-1']), cart)
    client.setQueryData(queryKeys.quote(['guest', 'g-1'], 1, null, 'ethereum'), {})
    await observer.mutate(input as never)
    expect(client.getQueryCache().findAll({ queryKey: ['guest'] })).toHaveLength(0)
    expect(store.has('kurio:u:u-0:checkout')).toBe(false)
    expect(store.has('kurio:u:u-1:checkout')).toBe(true)
  })

  it('a senha não vai para o armazenamento nem para chaves de Query', async () => {
    request.mockResolvedValue(authResponse())
    const { client, observer } = setup()
    await observer.mutate(input as never)
    expect([...store.values()].join()).not.toContain('s3gredo')
    const keys = client
      .getQueryCache()
      .getAll()
      .map((q) => JSON.stringify(q.queryKey))
    expect(keys.join()).not.toContain('s3gredo')
  })

  it('sem ajustes no merge não publica aviso', async () => {
    request.mockResolvedValue(authResponse())
    await setup().observer.mutate(input as never)
    expect(noticeBus.getSnapshot()).toHaveLength(0)
  })

  it('ajustes do merge viram um aviso polite', async () => {
    request.mockResolvedValue(authResponse([{ nftId: 'n1', editionId: 'e1', reason: 'SOLD_OUT' }]))
    await setup().observer.mutate(input as never)
    const [notice] = noticeBus.getSnapshot()
    expect(notice?.politeness).toBe('polite')
    expect(notice?.text).toContain('esgotou')
  })

  it('falha não grava sessão nem descarta o guestCartId', async () => {
    request.mockRejectedValue(networkError)
    await setup()
      .observer.mutate(input as never)
      .catch(() => undefined)
    expect(store.has('kurio:session')).toBe(false)
    expect(store.get('kurio:guestCartId')).toBe('g-1')
  })

  it('busca de sessão em andamento não sobrescreve o usuário novo', async () => {
    request.mockResolvedValue(authResponse())
    const { client, observer } = setup()
    const stale = pendingSessionFetch(client)
    await observer.mutate(input as never)
    stale.resolve(null)
    await stale.settled
    expect(client.getQueryData(queryKeys.session())).toEqual(user)
  })
})

function pendingSessionFetch(client: ReturnType<typeof createQueryClient>) {
  let resolve!: (value: User | null) => void
  const settled = client
    .fetchQuery({
      queryKey: queryKeys.session(),
      queryFn: () => new Promise<User | null>((r) => (resolve = r)),
      staleTime: 0,
    })
    .catch(() => undefined)
  return { resolve: (value: User | null) => resolve(value), settled }
}

describe('logout', () => {
  function setup() {
    store.set('kurio:session', JSON.stringify({ token: 'tok-1', uid: 'u-1' }))
    const client = createQueryClient()
    client.setQueryData(queryKeys.session(), user)
    const order: string[] = []
    request.mockImplementation(() => {
      order.push('api')
      return Promise.resolve(undefined)
    })
    const cleaner = vi.fn((uid: string | null) => {
      order.push(`clean:${uid}`)
    })
    const observer = new MutationObserver(client, logoutMutation(client, cleaner))
    return { client, observer, cleaner, order }
  }

  it('chama a API e depois o limpador com o uid, limpando a sessão local', async () => {
    const { client, observer, order } = setup()
    await observer.mutate()
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/auth/logout' })
    expect(order).toEqual(['api', 'clean:u-1'])
    expect(store.has('kurio:session')).toBe(false)
    expect(client.getQueryData(queryKeys.session())).toBeNull()
  })

  it('com erro de rede ainda limpa localmente e resolve', async () => {
    const { observer, cleaner } = setup()
    request.mockRejectedValue(networkError)
    await expect(observer.mutate()).resolves.toBeUndefined()
    expect(cleaner).toHaveBeenCalledWith('u-1')
    expect(store.has('kurio:session')).toBe(false)
  })

  it('busca de sessão em andamento não recoloca o usuário antigo', async () => {
    const { client, observer } = setup()
    const stale = pendingSessionFetch(client)
    await observer.mutate()
    stale.resolve(user)
    await stale.settled
    expect(client.getQueryData(queryKeys.session())).toBeNull()
  })

  it.each([
    [
      'lança',
      () => {
        throw new Error('falha')
      },
    ],
    ['rejeita', () => Promise.reject(new Error('falha'))],
  ])('limpador que %s não quebra o logout', async (_label, failing) => {
    store.set('kurio:session', JSON.stringify({ token: 'tok-1', uid: 'u-1' }))
    request.mockResolvedValue(undefined)
    const client = createQueryClient()
    const observer = new MutationObserver(client, logoutMutation(client, failing))
    await expect(observer.mutate()).resolves.toBeUndefined()
    expect(store.has('kurio:session')).toBe(false)
  })
})
