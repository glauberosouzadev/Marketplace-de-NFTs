import { describe, expect, it, vi } from 'vitest'
import type { CreateOrderRequest } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>().mockResolvedValue({})
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { createOrder, getOrder } from './orders'

const body: CreateOrderRequest = {
  quoteId: 'q1',
  quoteFingerprint: 'fp',
  walletId: 'w1',
  connectionId: 'c1',
  network: 'ethereum',
  collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
}

describe('endpoints de pedidos', () => {
  it('POST /orders envia o corpo e a Idempotency-Key recebida', async () => {
    await createOrder(body, 'key-1')
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/orders',
      data: body,
      headers: { 'Idempotency-Key': 'key-1' },
    })
  })

  it('GET /orders/:id repassa o signal', async () => {
    const signal = new AbortController().signal
    await getOrder('o 1', signal)
    expect(request).toHaveBeenCalledWith({ method: 'GET', url: '/orders/o%201', signal })
  })
})
