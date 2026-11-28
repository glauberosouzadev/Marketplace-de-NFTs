import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrorEnvelope, ListFavoritesResponse } from '@/contracts'
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
  mutateDb((db) => {
    const expiresAt = '2999-01-01T00:00:00.000Z'
    db.sessions.push(
      { token: 'tok-ana', userId: 'user-001', expiresAt },
      { token: 'tok-bruno', userId: 'user-002', expiresAt },
    )
  })
})

const call = (method: string, path: string, token?: string) =>
  fetch(apiUrl(path), {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

const list = async (token: string) =>
  (await (await call('GET', '/me/favorites', token)).json()) as ListFavoritesResponse

const firstNftId = (): string => getDb().nfts[0]!.id

describe('/me/favorites', () => {
  it('401 sem sessão nas três rotas', async () => {
    const id = firstNftId()
    for (const [method, path] of [
      ['GET', '/me/favorites'],
      ['PUT', `/me/favorites/${id}`],
      ['DELETE', `/me/favorites/${id}`],
    ] as const) {
      const res = await call(method, path)
      expect(res.status).toBe(401)
      expect(['UNAUTHENTICATED', 'SESSION_EXPIRED']).toContain(
        ((await res.json()) as ErrorEnvelope).code,
      )
    }
  })

  it('PUT cria sem duplicar e GET devolve o NftSummary', async () => {
    const id = firstNftId()
    expect((await call('PUT', `/me/favorites/${id}`, 'tok-ana')).status).toBe(204)
    expect((await call('PUT', `/me/favorites/${id}`, 'tok-ana')).status).toBe(204)
    const { items } = await list('tok-ana')
    expect(items).toHaveLength(1)
    expect(items[0]?.nftId).toBe(id)
    expect(items[0]?.nft.id).toBe(id)
    expect(items[0]?.nft).not.toHaveProperty('editions')
  })

  it('lista ordenada por createdAt desc', async () => {
    const [a, b] = getDb().nfts.map((n) => n.id)
    mutateDb((db) => {
      db.favorites.push(
        { userId: 'user-001', nftId: a!, createdAt: '2030-01-01T00:00:00.000Z' },
        { userId: 'user-001', nftId: b!, createdAt: '2030-01-02T00:00:00.000Z' },
      )
    })
    expect((await list('tok-ana')).items.map((i) => i.nftId)).toEqual([b, a])
  })

  it('DELETE remove e repetir devolve 204', async () => {
    const id = firstNftId()
    await call('PUT', `/me/favorites/${id}`, 'tok-ana')
    expect((await call('DELETE', `/me/favorites/${id}`, 'tok-ana')).status).toBe(204)
    expect((await call('DELETE', `/me/favorites/${id}`, 'tok-ana')).status).toBe(204)
    expect((await list('tok-ana')).items).toEqual([])
  })

  it('isola favoritos entre usuários', async () => {
    const id = firstNftId()
    await call('PUT', `/me/favorites/${id}`, 'tok-ana')
    expect((await list('tok-bruno')).items).toEqual([])
    await call('DELETE', `/me/favorites/${id}`, 'tok-bruno')
    expect((await list('tok-ana')).items).toHaveLength(1)
  })

  it('PUT de NFT inexistente devolve 404 NOT_FOUND', async () => {
    const res = await call('PUT', '/me/favorites/nft-inexistente', 'tok-ana')
    expect(res.status).toBe(404)
    expect(((await res.json()) as ErrorEnvelope).code).toBe('NOT_FOUND')
  })

  it('S-03: primeiro PUT falha com 503 TRANSIENT e o seguinte tem sucesso', async () => {
    activateScenario('S-03')
    const id = firstNftId()
    const first = await call('PUT', `/me/favorites/${id}`, 'tok-ana')
    expect(first.status).toBe(503)
    expect(((await first.json()) as ErrorEnvelope).code).toBe('TRANSIENT')
    expect((await call('PUT', `/me/favorites/${id}`, 'tok-ana')).status).toBe(204)
  })
})
