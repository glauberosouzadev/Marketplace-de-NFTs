import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateOrderRequest } from '@/contracts'
import { setCartLine, toCartItem } from './cart'
import {
  createOrder,
  REJECT_REASON,
  requestFingerprintOf,
  settleOrder,
  validateOrderRequest,
} from './orders'
import { buildQuote } from './quote'
import { getDb, mutateDb, resetDb } from './store'
import { disconnectConnection } from './wallets'

const hooks = vi.hoisted(() => ({ afterQuote: undefined as (() => void) | undefined }))

/** Simula uma mudança de estado durante o `await buildQuote` do `createOrder`. */
vi.mock('./quote', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./quote')>()
  return {
    ...actual,
    buildQuote: async (...args: Parameters<typeof actual.buildQuote>) => {
      const quote = await actual.buildQuote(...args)
      hooks.afterQuote?.()
      return quote
    },
  }
})

const USER = 'user-001'

async function requestFor(
  overrides: Partial<CreateOrderRequest> = {},
): Promise<CreateOrderRequest> {
  const cart = getDb().carts.find((c) => c.owner === `user:${USER}`)!
  const quote = await buildQuote(getDb(), cart, 'ethereum')
  return {
    quoteId: quote.id,
    quoteFingerprint: quote.fingerprint,
    walletId: 'wallet-001',
    connectionId: 'conn-001',
    network: 'ethereum',
    collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
    ...overrides,
  }
}

const create = (request: CreateOrderRequest, idempotencyKey = 'key-1') =>
  createOrder({ userId: USER, idempotencyKey, request })

beforeEach(() => {
  hooks.afterQuote = undefined
  resetDb()
  const nft = getDb().nfts[0]!
  setCartLine(`user:${USER}`, toCartItem(nft, nft.editions[0]!, 1))
})

describe('createOrder: idempotência', () => {
  it('chave nova cria pedido pending com snapshot', async () => {
    const result = await create(await requestFor())
    expect(result.kind).toBe('created')
    if (result.kind !== 'created') return
    expect(result.order).toMatchObject({
      status: 'pending',
      version: 1,
      snapshot: {
        network: 'ethereum',
        wallet: {
          label: 'Carteira principal',
          address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
          provider: 'metamask',
        },
        collector: { displayName: 'Ana' },
      },
    })
    expect(typeof result.order.snapshot.total).toBe('string')
    expect(getDb().orders).toHaveLength(1)
  })

  it('mesma chave e mesmo request devolve o mesmo pedido', async () => {
    const request = await requestFor()
    const first = await create(request)
    const replay = await create(request)
    expect(replay.kind).toBe('replay')
    if (first.kind !== 'created' || replay.kind !== 'replay') return
    expect(replay.order.id).toBe(first.order.id)
    expect(getDb().orders).toHaveLength(1)
  })

  it('mesma chave e request diferente é conflito', async () => {
    const request = await requestFor()
    await create(request)
    const other = { ...request, collector: { ...request.collector, displayName: 'Outra' } }
    expect((await create(other)).kind).toBe('conflict')
    expect(getDb().orders).toHaveLength(1)
  })

  it('envios concorrentes com a mesma chave criam um só pedido', async () => {
    const request = await requestFor()
    const results = await Promise.all([create(request), create(request)])
    expect(results.map((r) => r.kind).sort()).toEqual(['created', 'replay'])
    expect(getDb().orders).toHaveLength(1)
  })
})

describe('createOrder: bloqueios sem pedido', () => {
  it('cotação divergente devolve stale com a nova cotação', async () => {
    const request = await requestFor()
    mutateDb((db) => {
      db.nfts[0]!.editions[0]!.price = '9.5'
    })
    const result = await create(request)
    expect(result.kind).toBe('stale')
    if (result.kind === 'stale') expect(result.quote.lines[0]?.unitPrice).toBe('9.5')
    expect(getDb().orders).toHaveLength(0)
  })

  it('conexão desconectada bloqueia o envio', async () => {
    const request = await requestFor()
    disconnectConnection('conn-001')
    expect((await create(request)).kind).toBe('disconnected')
    expect(getDb().orders).toHaveLength(0)
  })

  it('desconexão durante a recotação não cria pedido', async () => {
    const request = await requestFor()
    hooks.afterQuote = () => disconnectConnection('conn-001')
    expect((await create(request)).kind).toBe('disconnected')
    expect(getDb().orders).toHaveLength(0)
  })

  it('carrinho esvaziado durante a recotação não cria pedido', async () => {
    const request = await requestFor()
    hooks.afterQuote = () =>
      mutateDb((db) => {
        db.carts = []
      })
    expect((await create(request)).kind).toBe('invalid')
    expect(getDb().orders).toHaveLength(0)
  })

  it('carteira de outro usuário é inválida', async () => {
    const request = await requestFor({ walletId: 'wallet-003', connectionId: 'conn-003' })
    expect((await create(request)).kind).toBe('invalid')
    expect(getDb().orders).toHaveLength(0)
  })

  it('carrinho vazio é inválido', async () => {
    const request = await requestFor()
    mutateDb((db) => {
      db.carts = []
    })
    expect(await create(request)).toEqual({
      kind: 'invalid',
      fieldErrors: { cart: 'Carrinho vazio' },
    })
  })
})

describe('validação e fingerprint do request', () => {
  it('aponta campos obrigatórios ausentes', () => {
    const result = validateOrderRequest({ collector: { email: 'x' } })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.fieldErrors).sort()).toEqual(
      [
        'connectionId',
        'displayName',
        'email',
        'network',
        'profileName',
        'quoteFingerprint',
        'quoteId',
        'walletId',
      ].sort(),
    )
  })

  it('não depende da ordem das chaves do colecionador', async () => {
    const request = await requestFor()
    const { displayName, profileName, email } = request.collector
    const reordered = { ...request, collector: { email, profileName, displayName } }
    expect(await requestFingerprintOf(reordered)).toBe(await requestFingerprintOf(request))
  })

  // Mesmo vetor de src/features/checkout/request-fingerprint.test.ts: prende os dois hashes.
  it('vetor fixo compartilhado com o cliente', async () => {
    const vector: CreateOrderRequest = {
      quoteId: 'q1',
      quoteFingerprint: 'fp',
      walletId: 'w1',
      connectionId: 'c1',
      network: 'ethereum',
      collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test', note: 'oi' },
    }
    expect(await requestFingerprintOf(vector)).toBe(
      'eb9da298229c53cd8b45a182fd2b7cf80392b08963b50cf477b26c32a67a6d5a',
    )
  })
})

describe('settleOrder', () => {
  async function pendingOrder() {
    const nft = getDb().nfts[0]!
    setCartLine(`user:${USER}`, toCartItem(nft, nft.editions[0]!, 2))
    const result = await create(await requestFor())
    if (result.kind !== 'created') throw new Error('pedido nao criado')
    return result.order
  }

  it('confirmação decrementa a disponibilidade e baixa só o comprado', async () => {
    const order = await pendingOrder()
    const [nft] = getDb().nfts
    const { available } = nft!.editions[0]!
    const later = getDb().nfts[1]!
    setCartLine(`user:${USER}`, toCartItem(later, later.editions[0]!, 1))
    setCartLine(`user:${USER}`, toCartItem(nft!, nft!.editions[0]!, 3))

    const settled = settleOrder(order.id, 'confirmed')

    expect(settled?.order).toMatchObject({ status: 'confirmed', version: 2 })
    expect(settled?.order.txHash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(settled?.order.explorerUrl).toBe(
      `https://explorer.kurio.invalid/ethereum/tx/${settled?.order.txHash}`,
    )
    expect(settled?.nfts.map((n) => n.id)).toEqual([nft!.id])
    const edition = getDb().nfts[0]!.editions[0]!
    expect(edition.available).toBe(available - 2)
    expect(getDb().nfts[0]!.version).toBe(nft!.version + 1)
    const items = getDb().carts.find((c) => c.owner === `user:${USER}`)!.items
    expect(items.map((i) => [i.nftId, i.quantity])).toEqual([
      [nft!.id, 1],
      [later.id, 1],
    ])
  })

  it('recusa grava o motivo e preserva carrinho e disponibilidade', async () => {
    const order = await pendingOrder()
    const before = structuredClone(getDb())
    const settled = settleOrder(order.id, 'rejected')
    expect(settled?.order).toMatchObject({ status: 'rejected', rejectReason: REJECT_REASON })
    expect(settled?.nfts).toEqual([])
    expect(getDb().nfts).toEqual(before.nfts)
    expect(getDb().carts).toEqual(before.carts)
  })

  it('pedido terminal não muda em nova liquidação', async () => {
    const order = await pendingOrder()
    settleOrder(order.id, 'confirmed')
    const before = structuredClone(getDb())
    expect(settleOrder(order.id, 'rejected')).toBeNull()
    expect(settleOrder(order.id, 'confirmed')).toBeNull()
    expect(getDb()).toEqual(before)
  })

  it('pedido inexistente devolve null', () => {
    expect(settleOrder('order-x', 'confirmed')).toBeNull()
  })
})
