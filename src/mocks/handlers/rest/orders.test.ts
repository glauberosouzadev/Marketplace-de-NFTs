import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateOrderRequest, ErrorEnvelope, Order } from '@/contracts'
import { setCartLine, toCartItem } from '../../db/cart'
import { buildQuote } from '../../db/quote'
import { getDb, mutateDb, resetDb } from '../../db/store'
import { activateScenario } from '../../scenarios/active'
import { settleOrder } from '../../settlement'
import { apiUrl } from '../util'
import { restHandlers } from '.'

vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/v1'))

const forceDeclined = vi.hoisted(() => ({ on: false }))
vi.mock('../../scenarios/active', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../scenarios/active')>()
  return {
    ...actual,
    getActiveEngine: () => {
      const engine = actual.getActiveEngine()
      if (!forceDeclined.on) return engine
      return {
        ...engine,
        scenario: { ...engine.scenario, flows: { ...engine.scenario.flows, order: 'declined' } },
        plan: engine.plan.bind(engine),
      } as typeof engine
    },
  }
})

const server = setupServer(...restHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  forceDeclined.on = false
  resetDb()
  activateScenario('default')
  const nft = getDb().nfts[0]!
  setCartLine('user:user-001', toCartItem(nft, nft.editions[0]!, 1))
  mutateDb((db) => {
    const expiresAt = '2999-01-01T00:00:00.000Z'
    db.sessions.push(
      { token: 'tok-ana', userId: 'user-001', expiresAt },
      { token: 'tok-bruno', userId: 'user-002', expiresAt },
    )
  })
})

async function orderBody(): Promise<CreateOrderRequest> {
  const cart = getDb().carts.find((c) => c.owner === 'user:user-001')!
  const quote = await buildQuote(getDb(), cart, 'ethereum')
  return {
    quoteId: quote.id,
    quoteFingerprint: quote.fingerprint,
    walletId: 'wallet-001',
    connectionId: 'conn-001',
    network: 'ethereum',
    collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
  }
}

const postOrder = (body: unknown, key = 'key-1', signal?: AbortSignal) =>
  fetch(apiUrl('/orders'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok-ana',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  })

const getOrder = (id: string, token: string) =>
  fetch(apiUrl(`/orders/${id}`), { headers: { Authorization: `Bearer ${token}` } })

describe('POST /orders', () => {
  it('201 na primeira chamada e 200 com o mesmo pedido no replay', async () => {
    const body = await orderBody()
    const first = await postOrder(body)
    expect(first.status).toBe(201)
    const created = (await first.json()) as Order
    expect(created.status).toBe('pending')

    const replay = await postOrder(body)
    expect(replay.status).toBe(200)
    expect(((await replay.json()) as Order).id).toBe(created.id)
    expect(getDb().orders).toHaveLength(1)
  })

  it('409 IDEMPOTENCY_CONFLICT com a mesma chave e corpo diferente', async () => {
    const body = await orderBody()
    await postOrder(body)
    const response = await postOrder({ ...body, quoteId: 'quote-outra' })
    expect(response.status).toBe(409)
    expect(((await response.json()) as ErrorEnvelope).code).toBe('IDEMPOTENCY_CONFLICT')
  })

  it('409 QUOTE_STALE quando a cotação mudou, sem pedido', async () => {
    const body = await orderBody()
    mutateDb((db) => {
      db.nfts[0]!.editions[0]!.available = 0
    })
    const response = await postOrder(body)
    expect(response.status).toBe(409)
    expect(((await response.json()) as ErrorEnvelope).code).toBe('QUOTE_STALE')
    expect(getDb().orders).toHaveLength(0)
  })

  it('409 WALLET_DISCONNECTED com a conexão desconectada, sem pedido', async () => {
    const body = await orderBody()
    mutateDb((db) => {
      db.walletConnections.find((c) => c.id === 'conn-001')!.status = 'disconnected'
    })
    const response = await postOrder(body)
    expect(response.status).toBe(409)
    expect(((await response.json()) as ErrorEnvelope).code).toBe('WALLET_DISCONNECTED')
    expect(getDb().orders).toHaveLength(0)
  })

  it('chave nova após 4xx definitivo cria o pedido; a chave recusada não gerou nada', async () => {
    const body = await orderBody()
    mutateDb((db) => {
      db.walletConnections.find((c) => c.id === 'conn-001')!.status = 'disconnected'
    })
    expect((await postOrder(body, 'key-a')).status).toBe(409)
    mutateDb((db) => {
      db.walletConnections.find((c) => c.id === 'conn-001')!.status = 'connected'
    })
    expect((await postOrder(body, 'key-b')).status).toBe(201)
    expect(getDb().orders).toHaveLength(1)
  })

  it('422 sem chave de idempotência ou com campos ausentes', async () => {
    const missingKey = await fetch(apiUrl('/orders'), {
      method: 'POST',
      headers: { Authorization: 'Bearer tok-ana' },
      body: JSON.stringify(await orderBody()),
    })
    expect(missingKey.status).toBe(422)
    const invalid = await postOrder({})
    expect(invalid.status).toBe(422)
    expect(getDb().orders).toHaveLength(0)
  })

  it('401 sem sessão', async () => {
    const response = await fetch(apiUrl('/orders'), { method: 'POST', body: '{}' })
    expect(response.status).toBe(401)
  })

  it('S-08: pedido criado, resposta perdida e reenvio recupera o mesmo pedido', async () => {
    activateScenario('S-08')
    const body = await orderBody()
    await expect(postOrder(body, 'key-s08', AbortSignal.timeout(300))).rejects.toThrow()
    expect(getDb().orders).toHaveLength(1)

    const retry = await postOrder(body, 'key-s08')
    expect(retry.status).toBe(200)
    expect(((await retry.json()) as Order).id).toBe(getDb().orders[0]?.id)
    expect(getDb().orders).toHaveLength(1)
  })
})

describe('GET /orders/:id', () => {
  it('devolve o pedido do dono e 404 para outro usuário', async () => {
    const created = (await (await postOrder(await orderBody())).json()) as Order
    expect((await getOrder(created.id, 'tok-ana')).status).toBe(200)
    expect((await getOrder(created.id, 'tok-bruno')).status).toBe(404)
  })
})

describe('liquidação do pedido', () => {
  const fetchOrder = async (id: string) => (await (await getOrder(id, 'tok-ana')).json()) as Order

  it('default: fica pending até settleOrder; depois GET devolve confirmed com txHash', async () => {
    const created = (await (await postOrder(await orderBody())).json()) as Order
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect((await fetchOrder(created.id)).status).toBe('pending')

    settleOrder(created.id, 'confirmed')
    const settled = await fetchOrder(created.id)
    expect(settled).toMatchObject({ status: 'confirmed', version: 2 })
    expect(settled.txHash).toBeDefined()
    expect(settled.explorerUrl).toBeDefined()
  })

  it('S-09: confirma sozinho após a latência do cenário', async () => {
    activateScenario('S-09')
    const created = (await (await postOrder(await orderBody())).json()) as Order
    await expect
      .poll(async () => (await fetchOrder(created.id)).status, { timeout: 3000 })
      .toBe('confirmed')
  })

  it('declined: recusa sozinho após a latência, sem tocar na disponibilidade', async () => {
    activateScenario('S-09')
    forceDeclined.on = true
    const available = getDb().nfts[0]!.editions[0]!.available
    const created = (await (await postOrder(await orderBody())).json()) as Order
    await expect
      .poll(async () => (await fetchOrder(created.id)).status, { timeout: 3000 })
      .toBe('rejected')
    expect((await fetchOrder(created.id)).rejectReason).toBeDefined()
    expect(getDb().nfts[0]!.editions[0]!.available).toBe(available)
  })
})
