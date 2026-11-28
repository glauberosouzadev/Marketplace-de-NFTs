import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import type { WalletsResponse } from '@/contracts'

const request = vi.fn<(c: { signal?: AbortSignal }) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: { signal?: AbortSignal }) => request(c) }))

import { walletsQuery } from './queries'

const wallets: WalletsResponse = { primary: null, secondary: null }

beforeEach(() => {
  request.mockReset()
})

describe('walletsQuery', () => {
  it('busca /me/wallets com o signal sob a chave do usuário', async () => {
    request.mockResolvedValue(wallets)
    const client = createQueryClient()
    await client.fetchQuery(walletsQuery('u-1'))
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/me/wallets',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(client.getQueryData(['user', 'u-1', 'wallets'])).toBe(wallets)
    expect(walletsQuery('u-1').staleTime).toBe(60_000)
  })
})
