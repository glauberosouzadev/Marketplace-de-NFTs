import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys, type Scope } from '@/app/query-keys'
import type { Cart, Order, OrderStatus, OrderUpdatedEvent } from '@/contracts'
import type { NftUpdatedEvent } from '@/contracts/events'
import type { Notice } from './notices'
import { createRealtimeSync } from './realtime-sync'

const orderEvent = (id: string, version: number, status: OrderStatus): OrderUpdatedEvent => ({
  id,
  version,
  type: 'order.updated',
  occurredAt: '2026-11-27T10:00:00.000Z',
  audience: 'user:u1',
  resource: { type: 'order', id: 'o1' },
  data: { status },
})

const priceEvent = (id: string, version: number): NftUpdatedEvent => ({
  id,
  version,
  type: 'nft.updated',
  occurredAt: '2026-11-27T10:00:00.000Z',
  audience: 'public',
  resource: { type: 'nft', id: 'n1' },
  data: { priceFrom: '2', editions: [{ id: 'e1', price: '2', available: 1 }] },
})

const pending = { id: 'o1', status: 'pending', version: 1 } as Order

function setup() {
  const queryClient = createQueryClient()
  const published: Notice[] = []
  let scope: Scope = ['user', 'u1']
  const sync = createRealtimeSync({
    queryClient,
    notices: { publish: (n) => published.push(n) },
    getScope: () => scope,
  })
  const orderOf = (uid: string) => queryClient.getQueryData<Order>(queryKeys.order(uid, 'o1'))
  return { queryClient, published, sync, orderOf, setScope: (next: Scope) => (scope = next) }
}

describe('createRealtimeSync', () => {
  it('duplicata e versão antiga não alteram o cache nem repetem aviso', () => {
    const { queryClient, published, sync } = setup()
    queryClient.setQueryData(queryKeys.cart(['user', 'u1']), {
      items: [{ nftId: 'n1', editionId: 'e1', name: 'Aurora', unitPrice: '1' }],
    } as Cart)
    sync.handle(priceEvent('ev-1', 2))
    sync.handle(priceEvent('ev-1', 2))
    sync.handle(priceEvent('ev-0', 1))
    expect(published.map((n) => n.id)).toEqual(['ev-1:e1'])
  })

  it('pedido terminal lido por REST não regride por evento mais novo', () => {
    const { queryClient, sync, orderOf } = setup()
    const confirmed = { ...pending, status: 'confirmed', version: 2 } as Order
    queryClient.setQueryData(queryKeys.order('u1', 'o1'), confirmed)
    sync.observeOrder(confirmed)
    sync.handle(orderEvent('ev-1', 3, 'pending'))
    expect(orderOf('u1')).toBe(confirmed)
  })

  it('aplica order.updated do usuário atual e ignora o de outro usuário', () => {
    const { queryClient, sync, orderOf } = setup()
    queryClient.setQueryData(queryKeys.order('u1', 'o1'), pending)
    sync.handle({ ...orderEvent('ev-x', 2, 'confirmed'), audience: 'user:u2' })
    expect(orderOf('u1')).toBe(pending)
    sync.handle(orderEvent('ev-1', 2, 'confirmed'))
    expect(orderOf('u1')?.status).toBe('confirmed')
  })

  it('depois do logout, eventos do usuário anterior não alteram o cache', () => {
    const { queryClient, published, sync, orderOf, setScope } = setup()
    setScope(['guest', 'g1'])
    sync.reset()
    queryClient.setQueryData(queryKeys.order('u1', 'o1'), pending)
    sync.handle(orderEvent('ev-1', 2, 'confirmed'))
    expect(orderOf('u1')).toBe(pending)
    expect(published).toEqual([])
  })
})
