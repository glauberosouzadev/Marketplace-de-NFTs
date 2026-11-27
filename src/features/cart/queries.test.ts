import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys, type Scope } from '@/app/query-keys'
import type { Cart } from '@/contracts'

const request = vi.fn<(c: { signal?: AbortSignal }) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: { signal?: AbortSignal }) => request(c) }))

import { cartQuery } from './queries'

const scope: Scope = ['guest', 'g-1']
const cart: Cart = { id: 'c1', owner: 'guest:g-1', items: [], version: 1 }

beforeEach(() => {
  request.mockReset()
})

describe('cartQuery', () => {
  it('busca /cart sob a chave do escopo com o signal', async () => {
    request.mockResolvedValue(cart)
    const client = createQueryClient()
    await client.fetchQuery(cartQuery(scope))
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/cart', signal: expect.any(AbortSignal) }),
    )
    expect(client.getQueryData(queryKeys.cart(scope))).toBe(cart)
  })
})
