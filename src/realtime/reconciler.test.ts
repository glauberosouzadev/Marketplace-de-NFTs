import { describe, expect, it } from 'vitest'
import type { OrderStatus } from '@/contracts/entities'
import type { EventAudience, NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts/events'
import { createReconciler } from './reconciler'

const nftEvent = (
  id: string,
  version: number,
  audience: EventAudience = 'public',
): NftUpdatedEvent => ({
  id,
  version,
  type: 'nft.updated',
  occurredAt: '2026-11-27T10:00:00.000Z',
  audience,
  resource: { type: 'nft', id: 'nft-1' },
  data: { priceFrom: '1.5', editions: [] },
})

const orderEvent = (id: string, version: number, status: OrderStatus): OrderUpdatedEvent => ({
  id,
  version,
  type: 'order.updated',
  occurredAt: '2026-11-27T10:00:00.000Z',
  audience: 'user:u1',
  resource: { type: 'order', id: 'ord-1' },
  data: { status },
})

describe('createReconciler', () => {
  it('rejeita o mesmo id na segunda vez', () => {
    const r = createReconciler({ currentUserId: 'u1' })
    expect(r.accept(nftEvent('e1', 1))).toEqual({ apply: true })
    expect(r.accept(nftEvent('e1', 2))).toEqual({ apply: false, reason: 'duplicate' })
  })

  it('rejeita versão menor ou igual à conhecida, inclusive vinda de REST', () => {
    const r = createReconciler({ currentUserId: 'u1' })
    r.observeVersion({ type: 'nft', id: 'nft-1' }, 3)
    expect(r.accept(nftEvent('e1', 3))).toEqual({ apply: false, reason: 'stale' })
    expect(r.accept(nftEvent('e2', 2))).toEqual({ apply: false, reason: 'stale' })
    expect(r.accept(nftEvent('e3', 4))).toEqual({ apply: true })
    expect(r.accept(nftEvent('e4', 4))).toEqual({ apply: false, reason: 'stale' })
  })

  it('aceita public e user atual; rejeita outro usuário e convidado', () => {
    const r = createReconciler({ currentUserId: 'u1' })
    expect(r.accept(nftEvent('e1', 1, 'user:u2'))).toEqual({ apply: false, reason: 'audience' })
    expect(r.accept(nftEvent('e2', 1, 'public'))).toEqual({ apply: true })
    expect(r.accept(nftEvent('e3', 2, 'user:u1'))).toEqual({ apply: true })
    const guest = createReconciler({ currentUserId: null })
    expect(guest.accept(nftEvent('e4', 1, 'user:u1'))).toEqual({ apply: false, reason: 'audience' })
  })

  it.each<OrderStatus>(['confirmed', 'rejected'])(
    'bloqueia saída do estado terminal %s',
    (terminal) => {
      const r = createReconciler({ currentUserId: 'u1' })
      expect(r.accept(orderEvent('o1', 1, 'pending'))).toEqual({ apply: true })
      expect(r.accept(orderEvent('o2', 2, terminal))).toEqual({ apply: true })
      expect(r.accept(orderEvent('o3', 3, 'pending'))).toEqual({ apply: false, reason: 'terminal' })
      expect(r.accept(orderEvent('o4', 4, terminal))).toEqual({ apply: true })
    },
  )

  it.each<OrderStatus>(['confirmed', 'rejected'])(
    'pedido %s lido por REST não regride por evento de versão maior',
    (terminal) => {
      const r = createReconciler({ currentUserId: 'u1' })
      r.observeOrder({ id: 'ord-1', version: 2, status: terminal })
      expect(r.accept(orderEvent('o1', 2, terminal))).toEqual({ apply: false, reason: 'stale' })
      expect(r.accept(orderEvent('o2', 3, 'pending'))).toEqual({ apply: false, reason: 'terminal' })
    },
  )

  it('pedido pendente lido por REST só registra a versão', () => {
    const r = createReconciler({ currentUserId: 'u1' })
    r.observeOrder({ id: 'ord-1', version: 1, status: 'pending' })
    expect(r.accept(orderEvent('o1', 1, 'confirmed'))).toEqual({ apply: false, reason: 'stale' })
    expect(r.accept(orderEvent('o2', 2, 'confirmed'))).toEqual({ apply: true })
  })

  it('reset zera ids e versões', () => {
    const r = createReconciler({ currentUserId: 'u1' })
    r.accept(nftEvent('e1', 5))
    r.accept(orderEvent('o1', 1, 'confirmed'))
    r.reset()
    expect(r.accept(nftEvent('e1', 1))).toEqual({ apply: true })
    expect(r.accept(orderEvent('o2', 1, 'pending'))).toEqual({ apply: true })
  })

  it('não lembra mais ids que o teto (o mais antigo sai)', () => {
    const r = createReconciler({ currentUserId: 'u1', seenIdsLimit: 2 })
    const event = (id: string, resourceId: string): NftUpdatedEvent => ({
      ...nftEvent(id, 1),
      resource: { type: 'nft', id: resourceId },
    })
    r.accept(event('a', 'n1'))
    r.accept(event('b', 'n2'))
    r.accept(event('c', 'n3'))
    expect(r.accept(event('a', 'n4'))).toEqual({ apply: true })
    expect(r.accept(event('c', 'n5'))).toEqual({ apply: false, reason: 'duplicate' })
  })
})
