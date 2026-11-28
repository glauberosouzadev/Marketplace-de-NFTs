import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys, type Scope } from '@/app/query-keys'
import type { Cart, Nft, NftUpdatedEvent, Order, OrderStatus, OrderUpdatedEvent } from '@/contracts'
import { applyEvent } from './apply-event'
import type { Notice } from './notices'

const scope: Scope = ['user', 'u1']

const nft = {
  id: 'n1',
  name: 'Aurora',
  priceFrom: '1.5',
  version: 1,
  editions: [
    { id: 'e1', nftId: 'n1', label: 'Edição 1', price: '1.5', available: 3, soldOut: false },
    { id: 'e2', nftId: 'n1', label: 'Edição 2', price: '2', available: 1, soldOut: false },
  ],
} as Nft

const cart = {
  id: 'c1',
  owner: 'user:u1',
  version: 1,
  items: [
    {
      nftId: 'n1',
      editionId: 'e1',
      quantity: 1,
      name: 'Aurora',
      image: { url: '/a.png', alt: 'Aurora' },
      unitPrice: '1.5',
      available: 3,
    },
  ],
} as Cart

const nftEvent = (editions: NftUpdatedEvent['data']['editions']): NftUpdatedEvent => ({
  id: 'ev-1',
  version: 2,
  type: 'nft.updated',
  occurredAt: '2026-11-27T10:00:00.000Z',
  audience: 'public',
  resource: { type: 'nft', id: 'n1' },
  data: { priceFrom: '1.8', previousPrice: '1.5', editions },
})

const orderEvent = (status: OrderStatus): OrderUpdatedEvent => ({
  id: 'ev-o',
  version: 2,
  type: 'order.updated',
  occurredAt: '2026-11-27T10:00:00.000Z',
  audience: 'user:u1',
  resource: { type: 'order', id: 'o1' },
  data: { status, txHash: '0xabc' },
})

function setup(eventScope: Scope = scope) {
  const queryClient = createQueryClient()
  const published: Notice[] = []
  queryClient.setQueryData(queryKeys.nft('n1'), nft)
  queryClient.setQueryData(queryKeys.cart(scope), cart)
  queryClient.setQueryData(queryKeys.quote(scope, 1, null, 'ethereum'), { id: 'q1' })
  queryClient.setQueryData(queryKeys.nfts({}), { items: [] })
  const deps = {
    queryClient,
    scope: eventScope,
    notices: { publish: (n: Notice) => published.push(n) },
  }
  const stale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated
  return { queryClient, published, deps, stale }
}

describe('applyEvent nft.updated', () => {
  it('faz patch do detalhe, invalida coleções e avisa anterior → novo', () => {
    const { queryClient, published, deps, stale } = setup()
    applyEvent(nftEvent([{ id: 'e1', price: '1.8', available: 3 }]), deps)

    const patched = queryClient.getQueryData<Nft>(queryKeys.nft('n1'))
    expect(patched).toMatchObject({ priceFrom: '1.8', previousPrice: '1.5', version: 2 })
    expect(patched?.editions[0]).toMatchObject({ price: '1.8', available: 3, soldOut: false })
    expect(patched?.editions[1]).toBe(nft.editions[1])
    expect(stale(queryKeys.cart(scope))).toBe(true)
    expect(stale(queryKeys.quote(scope, 1, null, 'ethereum'))).toBe(true)
    expect(stale(queryKeys.nfts({}))).toBe(true)
    expect(published).toEqual([
      { id: 'ev-1:e1', politeness: 'polite', text: 'Preço de Aurora mudou: 1.5 → 1.8 ETH.' },
    ])
  })

  it('edição esgotada do carrinho gera aviso "esgotou" e marca a edição', () => {
    const { queryClient, published, deps } = setup()
    applyEvent(nftEvent([{ id: 'e1', price: '1.5', available: 0 }]), deps)
    expect(queryClient.getQueryData<Nft>(queryKeys.nft('n1'))?.editions[0]?.soldOut).toBe(true)
    expect(published).toEqual([
      { id: 'ev-1:e1', politeness: 'assertive', text: 'Aurora (Edição 1) esgotou.' },
    ])
  })

  it('preço igual (mesmo valor decimal) ou edição fora do carrinho não avisa', () => {
    const { published, deps } = setup()
    applyEvent(
      nftEvent([
        { id: 'e1', price: '1.50', available: 2 },
        { id: 'e2', price: '9', available: 0 },
      ]),
      deps,
    )
    expect(published).toEqual([])
  })

  it('linha já esgotada não repete "esgotou" quando outra edição muda', () => {
    const { queryClient, published, deps } = setup()
    queryClient.setQueryData(queryKeys.cart(scope), {
      ...cart,
      items: cart.items.map((item) => ({ ...item, available: 0 })),
    })
    applyEvent(
      nftEvent([
        { id: 'e1', price: '1.5', available: 0 },
        { id: 'e2', price: '2.5', available: 1 },
      ]),
      deps,
    )
    expect(published).toEqual([])
  })

  it('evento sem previousPrice apaga o valor antigo do detalhe', () => {
    const { queryClient, deps } = setup()
    queryClient.setQueryData(queryKeys.nft('n1'), { ...nft, previousPrice: '1.2' })
    applyEvent({ ...nftEvent([]), data: { priceFrom: '1.5', editions: [] } }, deps)
    expect(queryClient.getQueryData<Nft>(queryKeys.nft('n1'))).not.toHaveProperty('previousPrice')
  })

  it('sem detalhe em cache não cria entrada nova', () => {
    const { queryClient, deps } = setup()
    queryClient.removeQueries({ queryKey: queryKeys.nft('n1') })
    applyEvent(nftEvent([{ id: 'e1', price: '1.8', available: 3 }]), deps)
    expect(queryClient.getQueryData(queryKeys.nft('n1'))).toBeUndefined()
  })
})

describe('applyEvent order.updated', () => {
  const order = { id: 'o1', status: 'pending', version: 1, snapshot: { total: '1.5' } } as Order

  it.each([
    ['confirmed', 'polite', 'Pedido confirmado.'],
    ['rejected', 'assertive', 'Pedido recusado.'],
  ] as const)('%s: patch do pedido sem tocar o snapshot e aviso', (status, politeness, text) => {
    const { queryClient, published, deps } = setup()
    queryClient.setQueryData(queryKeys.order('u1', 'o1'), order)
    applyEvent(orderEvent(status), deps)
    const patched = queryClient.getQueryData<Order>(queryKeys.order('u1', 'o1'))
    expect(patched).toMatchObject({ status, version: 2, txHash: '0xabc' })
    expect(patched?.snapshot).toBe(order.snapshot)
    expect(published).toEqual([{ id: 'ev-o', politeness, text }])
  })

  it('pending não avisa; escopo de visitante não toca pedidos', () => {
    const { queryClient, published, deps } = setup()
    applyEvent(orderEvent('pending'), deps)
    expect(published).toEqual([])
    const guest = setup(['guest', 'g1'])
    guest.queryClient.setQueryData(queryKeys.order('u1', 'o1'), order)
    applyEvent(orderEvent('confirmed'), guest.deps)
    expect(guest.queryClient.getQueryData(queryKeys.order('u1', 'o1'))).toBe(order)
    expect(guest.published).toEqual([])
    expect(queryClient.getQueryData(queryKeys.order('u1', 'o1'))).toBeUndefined()
  })
})
