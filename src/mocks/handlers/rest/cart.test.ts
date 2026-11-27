import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cart, ErrorEnvelope, Nft } from '@/contracts'
import { getDb, mutateDb, resetDb } from '../../db/store'
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
  headers: Record<string, string> = GUEST,
  body?: unknown,
) =>
  fetch(apiUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const target = (): { nft: Nft; editionId: string; available: number } => {
  const nft = getDb().nfts.find((n) => n.editions.some((e) => e.available >= 2))!
  const edition = nft.editions.find((e) => e.available >= 2)!
  return { nft, editionId: edition.id, available: edition.available }
}

const add = (quantity: number, headers = GUEST) => {
  const { nft, editionId } = target()
  return call('POST', '/cart/items', headers, { nftId: nft.id, editionId, quantity })
}

describe('GET /cart', () => {
  it('401 sem dono; com guest cria carrinho vazio e repete o mesmo', async () => {
    const denied = await call('GET', '/cart', {})
    expect(denied.status).toBe(401)
    expect(((await denied.json()) as ErrorEnvelope).code).toBe('UNAUTHENTICATED')

    const first = (await (await call('GET', '/cart')).json()) as Cart
    const second = (await (await call('GET', '/cart')).json()) as Cart
    expect(first).toMatchObject({ owner: 'guest:guest-a', items: [] })
    expect(second).toEqual(first)
  })
})

describe('Authorization inválido', () => {
  it('401 sem cair no carrinho de visitante; SESSION_EXPIRED se expirou', async () => {
    mutateDb((db) => {
      db.sessions.push({
        token: 'tok-old',
        userId: db.users[0]!.id,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
    })
    const bad = await call('GET', '/cart', { ...GUEST, Authorization: 'Bearer xxx' })
    expect(bad.status).toBe(401)
    expect(((await bad.json()) as ErrorEnvelope).code).toBe('UNAUTHENTICATED')
    const expired = await call('GET', '/cart', { ...GUEST, Authorization: 'Bearer tok-old' })
    expect(expired.status).toBe(401)
    expect(((await expired.json()) as ErrorEnvelope).code).toBe('SESSION_EXPIRED')
    expect(getDb().carts).toEqual([])
  })
})

describe('POST /cart/items', () => {
  it('soma à linha existente e responde 409 sem alterar o carrinho quando excede', async () => {
    const { available } = target()
    await add(1)
    const summed = (await (await add(1)).json()) as Cart
    expect(summed.items).toHaveLength(1)
    expect(summed.items[0]!.quantity).toBe(2)

    const res = await add(available)
    expect(res.status).toBe(409)
    expect(((await res.json()) as ErrorEnvelope).code).toBe('AVAILABILITY_CONFLICT')
    const after = (await (await call('GET', '/cart')).json()) as Cart
    expect(after).toEqual(summed)
  })

  it('404 para NFT inexistente e 422 para quantidade inválida', async () => {
    const missing = await call('POST', '/cart/items', GUEST, {
      nftId: 'nao-existe',
      editionId: 'x',
      quantity: 1,
    })
    expect(missing.status).toBe(404)
    for (const quantity of [0, 1.5, '2']) {
      const { nft, editionId } = target()
      const res = await call('POST', '/cart/items', GUEST, { nftId: nft.id, editionId, quantity })
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrorEnvelope).fieldErrors).toHaveProperty('quantity')
    }
  })
})

describe('PATCH e DELETE /cart/items/:nftId/:editionId', () => {
  it('operam por linha; linha inexistente responde 404', async () => {
    const { nft, editionId } = target()
    const path = `/cart/items/${nft.id}/${editionId}`
    expect((await call('PATCH', path, GUEST, { quantity: 2 })).status).toBe(404)
    expect((await call('DELETE', path)).status).toBe(404)

    await add(1)
    const patched = (await (await call('PATCH', path, GUEST, { quantity: 2 })).json()) as Cart
    expect(patched.items[0]!.quantity).toBe(2)
    expect((await call('PATCH', path, GUEST, { quantity: 0 })).status).toBe(422)

    const removed = (await (await call('DELETE', path)).json()) as Cart
    expect(removed.items).toEqual([])
  })
})

describe('isolamento por dono', () => {
  it('carrinhos de guests e de usuário não se misturam', async () => {
    mutateDb((db) => {
      db.sessions.push({
        token: 'tok-u',
        userId: db.users[0]!.id,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
    })
    await add(1)
    await add(2, { 'X-Guest-Cart-Id': 'guest-b' })
    const user = (await (
      await call('GET', '/cart', { Authorization: 'Bearer tok-u' })
    ).json()) as Cart
    const a = (await (await call('GET', '/cart')).json()) as Cart
    const b = (await (await call('GET', '/cart', { 'X-Guest-Cart-Id': 'guest-b' })).json()) as Cart
    expect(user.owner).toMatch(/^user:/)
    expect(user.items).toEqual([])
    expect(a.items[0]!.quantity).toBe(1)
    expect(b.items[0]!.quantity).toBe(2)
  })
})

describe('Cart.version', () => {
  it('aumenta a cada mutação bem-sucedida e não muda em falha', async () => {
    const { nft, editionId, available } = target()
    const path = `/cart/items/${nft.id}/${editionId}`
    const versions: number[] = []
    const read = async (res: Response) => versions.push(((await res.json()) as Cart).version)
    await read(await add(1))
    await read(await call('PATCH', path, GUEST, { quantity: 2 }))
    await add(available + 1)
    await read(await call('DELETE', path))
    expect(versions[1]!).toBeGreaterThan(versions[0]!)
    expect(versions[2]!).toBe(versions[1]! + 1)
  })
})
