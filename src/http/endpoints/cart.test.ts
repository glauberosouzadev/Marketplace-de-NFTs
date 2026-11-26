import { describe, expect, it, vi } from 'vitest'

const request = vi.fn<(c: unknown) => Promise<unknown>>().mockResolvedValue({})
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { addCartItem } from './cart'

describe('addCartItem', () => {
  it('POST /cart/items com o corpo do contrato', async () => {
    const body = { nftId: 'n1', editionId: 'e1', quantity: 2 }
    await addCartItem(body)
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/cart/items', data: body })
  })
})
