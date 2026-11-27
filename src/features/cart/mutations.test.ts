import { MutationObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys, type Scope } from '@/app/query-keys'
import { createQueryClient } from '@/app/query-client'
import type { ApiError, Cart } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import {
  addToCartMutation,
  clearCouponMutation,
  removeCartItemMutation,
  setCouponMutation,
  updateCartItemMutation,
} from './mutations'

const scope: Scope = ['guest', 'g-1']
const body = { nftId: 'n1', editionId: 'e1', quantity: 2 }
const cart: Cart = { id: 'c1', owner: 'guest:g-1', items: [], version: 1 }
const conflict: ApiError = {
  kind: 'http',
  status: 409,
  code: 'AVAILABILITY_CONFLICT',
  message: 'conflito',
}

function setup() {
  const client = createQueryClient()
  client.setQueryData(queryKeys.cart(scope), cart)
  const observer = new MutationObserver(
    client,
    addToCartMutation(client, () => scope),
  )
  return { client, observer }
}

// Bloco com chaves: retornar o mock o faria rodar como teardown do vitest.
beforeEach(() => {
  request.mockReset()
})

describe('useAddToCart (addToCartMutation)', () => {
  it('sucesso invalida o carrinho do escopo', async () => {
    request.mockResolvedValue({ ...cart, version: 2 })
    const { client, observer } = setup()
    await observer.mutate(body)
    expect(request).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(queryKeys.cart(scope))?.isInvalidated).toBe(true)
  })

  it('invalida o escopo capturado no início, mesmo com login durante o request', async () => {
    const userScope: Scope = ['user', 'u-1']
    let current: Scope = scope
    let resolve!: (value: unknown) => void
    request.mockReturnValue(new Promise((r) => (resolve = r)))
    const client = createQueryClient()
    client.setQueryData(queryKeys.cart(scope), cart)
    client.setQueryData(queryKeys.cart(userScope), cart)
    const observer = new MutationObserver(
      client,
      addToCartMutation(client, () => current),
    )
    const pending = observer.mutate(body)
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    current = userScope
    resolve({ ...cart, version: 2 })
    await pending
    expect(client.getQueryState(queryKeys.cart(scope))?.isInvalidated).toBe(true)
    expect(client.getQueryState(queryKeys.cart(userScope))?.isInvalidated).toBe(false)
  })

  it('409 rejeita sem retry e não altera nem invalida o carrinho', async () => {
    request.mockRejectedValue(conflict)
    const { client, observer } = setup()
    await expect(observer.mutate(body)).rejects.toBe(conflict)
    expect(request).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(queryKeys.cart(scope))).toBe(cart)
    expect(client.getQueryState(queryKeys.cart(scope))?.isInvalidated).toBe(false)
  })
})

describe('mutations de item e cupom', () => {
  const quoteKey = queryKeys.quote(scope, 1, null, 'ethereum')
  const cases = [
    ['updateCartItem', updateCartItemMutation, { nftId: 'n1', editionId: 'e1', quantity: 3 }],
    ['removeCartItem', removeCartItemMutation, { nftId: 'n1', editionId: 'e1' }],
    ['setCoupon', setCouponMutation, { code: 'KURIO10' }],
    ['clearCoupon', clearCouponMutation, undefined],
  ] as const

  it.each(cases)(
    '%s invalida carrinho e cotação do escopo capturado',
    async (_n, factory, vars) => {
      const userScope: Scope = ['user', 'u-1']
      request.mockResolvedValue({ ...cart, version: 2 })
      const client = createQueryClient()
      client.setQueryData(queryKeys.cart(scope), cart)
      client.setQueryData(quoteKey, {})
      client.setQueryData(queryKeys.cart(userScope), cart)
      client.setQueryData(queryKeys.quote(userScope, 1, null, 'ethereum'), {})
      const observer = new MutationObserver(client, factory(client, () => scope) as never)
      await observer.mutate(vars as never)
      expect(client.getQueryState(queryKeys.cart(scope))?.isInvalidated).toBe(true)
      expect(client.getQueryState(quoteKey)?.isInvalidated).toBe(true)
      expect(client.getQueryState(queryKeys.cart(userScope))?.isInvalidated).toBe(false)
      expect(
        client.getQueryState(queryKeys.quote(userScope, 1, null, 'ethereum'))?.isInvalidated,
      ).toBe(false)
    },
  )

  it('422 de cupom chega com fieldErrors.code e o carrinho não muda', async () => {
    const invalid: ApiError = {
      kind: 'http',
      status: 422,
      code: 'VALIDATION',
      message: 'cupom inválido',
      fieldErrors: { code: 'Cupom inválido' },
    }
    request.mockRejectedValue(invalid)
    const { client } = setup()
    const observer = new MutationObserver(
      client,
      setCouponMutation(client, () => scope),
    )
    await expect(observer.mutate({ code: 'X' })).rejects.toMatchObject({
      fieldErrors: { code: 'Cupom inválido' },
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(queryKeys.cart(scope))).toBe(cart)
  })
})
