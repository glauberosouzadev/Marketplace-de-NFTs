import { describe, expect, it, vi } from 'vitest'

const request = vi.fn<(c: unknown) => Promise<unknown>>().mockResolvedValue({})
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import {
  addCartItem,
  clearCoupon,
  getCart,
  removeCartItem,
  setCoupon,
  updateCartItem,
} from './cart'

describe('addCartItem', () => {
  it('POST /cart/items com o corpo do contrato', async () => {
    const body = { nftId: 'n1', editionId: 'e1', quantity: 2 }
    await addCartItem(body)
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/cart/items', data: body })
  })
})

describe('demais endpoints do carrinho', () => {
  it('GET /cart repassa o signal', async () => {
    const signal = new AbortController().signal
    await getCart(signal)
    expect(request).toHaveBeenCalledWith({ method: 'GET', url: '/cart', signal })
  })

  it('PATCH e DELETE do item usam nftId/editionId na URL', async () => {
    await updateCartItem('n 1', 'e1', { quantity: 3 })
    expect(request).toHaveBeenCalledWith({
      method: 'PATCH',
      url: '/cart/items/n%201/e1',
      data: { quantity: 3 },
    })
    await removeCartItem('n1', 'e1')
    expect(request).toHaveBeenCalledWith({ method: 'DELETE', url: '/cart/items/n1/e1' })
  })

  it('PUT e DELETE do cupom', async () => {
    await setCoupon({ code: 'KURIO10' })
    expect(request).toHaveBeenCalledWith({
      method: 'PUT',
      url: '/cart/coupon',
      data: { code: 'KURIO10' },
    })
    await clearCoupon()
    expect(request).toHaveBeenCalledWith({ method: 'DELETE', url: '/cart/coupon' })
  })
})
