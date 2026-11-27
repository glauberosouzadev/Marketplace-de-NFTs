import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cart, ErrorEnvelope, Quote } from '@/contracts'
import { getDb, resetDb } from '../../db/store'
import { NETWORK_FEES } from '../../fixtures/networks'
import { activateScenario } from '../../scenarios/active'
import { apiUrl } from '../util'
import { restHandlers } from '.'

vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/v1'))

const server = setupServer(...restHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  resetDb()
  activateScenario('default')
})

const GUEST = { 'X-Guest-Cart-Id': 'guest-a' }

const call = (
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = GUEST,
) =>
  fetch(apiUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const target = () => {
  const nft = getDb().nfts.find((n) => n.editions.some((e) => e.available >= 2))!
  const edition = nft.editions.find((e) => e.available >= 2)!
  return { nftId: nft.id, editionId: edition.id }
}

const quote = async (body: unknown = {}) =>
  (await (await call('POST', '/quotes', body)).json()) as Quote

describe('POST /quotes', () => {
  it('401 sem dono', async () => {
    const res = await call('POST', '/quotes', {}, {})
    expect(res.status).toBe(401)
    expect(((await res.json()) as ErrorEnvelope).code).toBe('UNAUTHENTICATED')
  })

  it('carrinho vazio cota zero, rede default ethereum', async () => {
    const q = await quote()
    expect(q).toMatchObject({
      network: 'ethereum',
      subtotal: '0',
      total: '0',
      lines: [],
      issues: [],
    })
  })

  it('cartVersion acompanha o carrinho; ids únicos; fingerprint estável', async () => {
    const cart = (await (
      await call('POST', '/cart/items', { ...target(), quantity: 1 })
    ).json()) as Cart
    const a = await quote()
    const b = await quote()
    expect(a.cartVersion).toBe(cart.version)
    expect(a.id).not.toBe(b.id)
    expect(a.fingerprint).toBe(b.fingerprint)
    expect(a.networkFee).toBe(NETWORK_FEES.ethereum)
  })

  it('quantidade, cupom e rede alteram o fingerprint', async () => {
    const { nftId, editionId } = target()
    await call('POST', '/cart/items', { nftId, editionId, quantity: 1 })
    const base = (await quote()).fingerprint

    expect((await quote({ network: 'polygon' })).fingerprint).not.toBe(base)
    await call('PUT', '/cart/coupon', { code: 'KURIO10' })
    const withCoupon = (await quote()).fingerprint
    expect(withCoupon).not.toBe(base)
    await call('PATCH', `/cart/items/${nftId}/${editionId}`, { quantity: 2 })
    expect((await quote()).fingerprint).not.toBe(withCoupon)
  })

  it('422 para rede desconhecida', async () => {
    const res = await call('POST', '/quotes', { network: 'bitcoin' })
    expect(res.status).toBe(422)
    expect(((await res.json()) as ErrorEnvelope).fieldErrors?.network).toBeTruthy()
  })
})
