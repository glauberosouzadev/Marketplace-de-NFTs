import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { User } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { sessionQuery } from './queries'

const store = new Map<string, string>()
const user: User = {
  id: 'u-1',
  username: 'ana',
  email: 'a@k.io',
  displayName: 'Ana',
  ensName: 'ana.eth',
  version: 1,
}

beforeEach(() => {
  request.mockReset()
  store.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  })
})

describe('sessionQuery', () => {
  it('sem token local resolve null sem chamar a API', async () => {
    const client = createQueryClient()
    await expect(client.fetchQuery(sessionQuery())).resolves.toBeNull()
    expect(request).not.toHaveBeenCalled()
  })

  it('com token válido recupera o usuário (refresh mantém a sessão)', async () => {
    store.set('kurio:session', JSON.stringify({ token: 'tok-1', uid: 'u-1' }))
    request.mockResolvedValue({ user, expiresAt: '2026-12-01T00:00:00Z' })
    const client = createQueryClient()
    await client.fetchQuery(sessionQuery())
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/auth/session' }),
    )
    expect(client.getQueryData(queryKeys.session())).toEqual(user)
  })

  it('não refaz em erro (retry 0) e usa a chave de sessão', () => {
    const options = sessionQuery()
    expect(options.retry).toBe(0)
    expect(options.queryKey).toEqual(['session'])
  })
})
