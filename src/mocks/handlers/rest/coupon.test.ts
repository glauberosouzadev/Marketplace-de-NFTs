import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cart, ErrorEnvelope, Quote } from '@/contracts'
import { getDb, resetDb } from '../../db/store'
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

const addItem = () => {
  const nft = getDb().nfts.find((n) => n.editions.some((e) => e.available >= 1))!
  const edition = nft.editions.find((e) => e.available >= 1)!
  return call('POST', '/cart/items', { nftId: nft.id, editionId: edition.id, quantity: 1 })
}

const quote = async () => (await (await call('POST', '/quotes', {})).json()) as Quote

describe('PUT /cart/coupon', () => {
  it('KURIO10 salva couponCode e a cotação aplica desconto', async () => {
    await addItem()
    const res = await call('PUT', '/cart/coupon', { code: 'KURIO10' })
    expect(res.status).toBe(200)
    expect(((await res.json()) as Cart).couponCode).toBe('KURIO10')
    const q = await quote()
    expect(q.coupon).toEqual({ code: 'KURIO10', status: 'applied' })
    expect(q.discount).not.toBe('0')
  })

  it.each([
    ['EXPIRADO20', 'COUPON_EXPIRED'],
    ['PAUSADO15', 'COUPON_INVALID'],
    ['DESCONHECIDO', 'COUPON_INVALID'],
    ['', 'COUPON_INVALID'],
  ])('%s responde 422 %s com fieldErrors.code e carrinho inalterado', async (code, errorCode) => {
    await call('PUT', '/cart/coupon', { code: 'KURIO10' })
    const before = (await (await call('GET', '/cart')).json()) as Cart
    const res = await call('PUT', '/cart/coupon', { code })
    expect(res.status).toBe(422)
    const body = (await res.json()) as ErrorEnvelope
    expect(body.code).toBe(errorCode)
    expect(body.fieldErrors?.code).toBeTruthy()
    expect(await (await call('GET', '/cart')).json()).toEqual(before)
  })

  it('mensagens distintas para expirado e inválido', async () => {
    const exp = (await (
      await call('PUT', '/cart/coupon', { code: 'EXPIRADO20' })
    ).json()) as ErrorEnvelope
    const inv = (await (
      await call('PUT', '/cart/coupon', { code: 'PAUSADO15' })
    ).json()) as ErrorEnvelope
    expect(exp.fieldErrors?.code).not.toBe(inv.fieldErrors?.code)
  })

  it('401 sem dono ou com Authorization inválido', async () => {
    expect((await call('PUT', '/cart/coupon', { code: 'KURIO10' }, {})).status).toBe(401)
    const bad = await call(
      'PUT',
      '/cart/coupon',
      { code: 'KURIO10' },
      { ...GUEST, Authorization: 'Bearer x' },
    )
    expect(bad.status).toBe(401)
    expect(getDb().carts.find((c) => c.owner === 'guest:guest-a')).toBeUndefined()
  })
})

describe('DELETE /cart/coupon', () => {
  it('remove o cupom e a próxima cotação vem sem desconto', async () => {
    await addItem()
    await call('PUT', '/cart/coupon', { code: 'KURIO10' })
    const res = await call('DELETE', '/cart/coupon')
    expect(res.status).toBe(200)
    expect((await res.json()) as Cart).not.toHaveProperty('couponCode')
    const q = await quote()
    expect(q.discount).toBe('0')
    expect(q.coupon).toBeUndefined()
  })

  it('isola por dono: cupom de um visitante não aparece para outro', async () => {
    await call('PUT', '/cart/coupon', { code: 'KURIO10' })
    const other = (await (
      await call('GET', '/cart', undefined, { 'X-Guest-Cart-Id': 'guest-b' })
    ).json()) as Cart
    expect(other.couponCode).toBeUndefined()
  })
})
