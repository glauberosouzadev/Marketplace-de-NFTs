import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { Order } from '@/contracts'

const request = vi.fn<(c: { signal?: AbortSignal }) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: { signal?: AbortSignal }) => request(c) }))

import { orderQuery } from './queries'

const order = { id: 'o1', userId: 'u-1', status: 'pending', version: 2 } as Order

beforeEach(() => {
  request.mockReset()
})

describe('orderQuery', () => {
  it('busca /orders/:id com o signal, sob a chave do usuário, e informa versão e status', async () => {
    request.mockResolvedValue(order)
    const client = createQueryClient()
    const observer = { observeOrder: vi.fn() }
    await client.fetchQuery(orderQuery('u-1', 'o1', observer))
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/orders/o1',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(client.getQueryData(queryKeys.order('u-1', 'o1'))).toBe(order)
    expect(observer.observeOrder).toHaveBeenCalledWith(order)
  })

  it('usa staleTime 0 e a chave do SDD-06', () => {
    const options = orderQuery('u-1', 'o1', { observeOrder: vi.fn() })
    expect(options.queryKey).toEqual(['user', 'u-1', 'order', 'o1'])
    expect(options.staleTime).toBe(0)
  })
})
