import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settleOrder } from './settlement'
import { setCartLine, toCartItem } from './db/cart'
import { createOrder } from './db/orders'
import { buildQuote } from './db/quote'
import { getDb, resetDb } from './db/store'

const emitted = vi.hoisted(() => [] as { type: string; audience: string; version: number }[])

vi.mock('./handlers/ws', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./handlers/ws')>()
  return { ...actual, emitEvent: (event: (typeof emitted)[number]) => void emitted.push(event) }
})

async function pendingOrderId(): Promise<string> {
  const nft = getDb().nfts[0]!
  setCartLine('user:user-001', toCartItem(nft, nft.editions[0]!, 1))
  const cart = getDb().carts.find((c) => c.owner === 'user:user-001')!
  const quote = await buildQuote(getDb(), cart, 'ethereum')
  const result = await createOrder({
    userId: 'user-001',
    idempotencyKey: 'k',
    request: {
      quoteId: quote.id,
      quoteFingerprint: quote.fingerprint,
      walletId: 'wallet-001',
      connectionId: 'conn-001',
      network: 'ethereum',
      collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
    },
  })
  if (result.kind !== 'created') throw new Error('pedido nao criado')
  return result.order.id
}

beforeEach(() => {
  emitted.length = 0
  resetDb()
})

describe('settleOrder do controle: eventos', () => {
  it('confirmação emite order.updated ao dono e nft.updated, com a version do recurso', async () => {
    const id = await pendingOrderId()
    settleOrder(id, 'confirmed')
    expect(emitted.map((e) => e.type)).toEqual(['order.updated', 'nft.updated'])
    expect(emitted[0]).toMatchObject({ audience: 'user:user-001', version: 2 })
  })

  it('recusa emite só order.updated', async () => {
    const id = await pendingOrderId()
    settleOrder(id, 'rejected')
    expect(emitted.map((e) => e.type)).toEqual(['order.updated'])
  })

  it('segunda liquidação não emite evento', async () => {
    const id = await pendingOrderId()
    settleOrder(id, 'confirmed')
    emitted.length = 0
    settleOrder(id, 'rejected')
    expect(emitted).toEqual([])
  })
})
