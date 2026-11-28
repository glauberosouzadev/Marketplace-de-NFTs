import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import type { ApiError, ListFavoritesResponse } from '@/contracts'

const request = vi.fn<(c: { signal?: AbortSignal }) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: { signal?: AbortSignal }) => request(c) }))

import { favoriteIdSet, favoritesQuery } from './queries'

const list = (...ids: string[]): ListFavoritesResponse => ({
  items: ids.map((nftId) => ({ nftId, createdAt: '2026-11-01T00:00:00Z', nft: {} as never })),
})

beforeEach(() => {
  request.mockReset()
})

describe('favoritesQuery', () => {
  it('busca /me/favorites com o signal sob a chave do usuário', async () => {
    const data = list('n1')
    request.mockResolvedValue(data)
    const client = createQueryClient()
    await client.fetchQuery(favoritesQuery('u-1'))
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/me/favorites',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(client.getQueryData(['user', 'u-1', 'favorites'])).toBe(data)
    expect(client.getQueryData(['user', 'u-2', 'favorites'])).toBeUndefined()
    expect(favoritesQuery('u-1').staleTime).toBe(60_000)
  })

  it('nunca refaz 4xx e refaz falha transitória até 2 vezes', () => {
    const retry = favoritesQuery('u-1').retry as (n: number, e: unknown) => boolean
    const unauthenticated: ApiError = {
      kind: 'http',
      status: 401,
      code: 'UNAUTHENTICATED',
      message: '',
    }
    const transient: ApiError = { kind: 'network', code: 'TRANSIENT', message: '' }
    expect(retry(0, unauthenticated)).toBe(false)
    expect(retry(1, transient)).toBe(true)
    expect(retry(2, transient)).toBe(false)
  })
})

describe('favoriteIdSet', () => {
  it('indexa os ids da lista num Set', () => {
    const ids = favoriteIdSet(list('n1', 'n2'))
    expect(ids.has('n1')).toBe(true)
    expect(ids.has('n3')).toBe(false)
  })
})
