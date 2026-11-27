import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthResponse, Cart, ErrorEnvelope, SessionResponse } from '@/contracts'
import { installMockControl, type MockControl } from '../../control'
import { getDb, resetDb } from '../../db/store'
import { activateScenario } from '../../scenarios/active'
import { apiUrl } from '../util'
import { restHandlers } from '.'

vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/v1'))

const server = setupServer(...restHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => vi.unstubAllGlobals())

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const NEW_USER = { username: 'carla.nova', email: 'carla@kurio.test', password: 'Senha1234' }

const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(apiUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const errorOf = async (res: Response) => (await res.json()) as ErrorEnvelope

function expireSessions(): void {
  const target: { __kurioMock?: MockControl } = {}
  vi.stubGlobal('window', target)
  installMockControl()
  target.__kurioMock!.expireSession()
}

describe('POST /auth/register (S-05)', () => {
  beforeEach(() => {
    resetDb()
    activateScenario('S-05')
  })

  it('201 com sessão e usuário público; banco guarda só hash + salt', async () => {
    const res = await call('POST', '/auth/register', NEW_USER)
    expect(res.status).toBe(201)
    const body = (await res.json()) as AuthResponse
    expect(body.session.token).toMatch(/^[0-9a-f]{64}$/)
    expect(body.user).toMatchObject({ username: 'carla.nova', email: 'carla@kurio.test' })
    expect(body.user).not.toHaveProperty('passwordHash')
    expect(body.user).not.toHaveProperty('salt')
    expect(body.cartAdjustments).toEqual([])

    const stored = getDb().users.find((u) => u.id === body.user.id)!
    expect(stored.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(getDb())).not.toContain(NEW_USER.password)
    expect(getDb().sessions.some((s) => s.token === body.session.token)).toBe(true)
  })

  it('409 EMAIL_TAKEN e USERNAME_TAKEN no campo correspondente', async () => {
    const email = await call('POST', '/auth/register', { ...NEW_USER, email: 'ANA@kurio.test' })
    expect(email.status).toBe(409)
    expect(await errorOf(email)).toMatchObject({
      code: 'EMAIL_TAKEN',
      fieldErrors: { email: expect.any(String) },
    })

    const username = await call('POST', '/auth/register', {
      ...NEW_USER,
      username: 'ana.colecionadora',
    })
    expect(username.status).toBe(409)
    const error = await errorOf(username)
    expect(error.code).toBe('USERNAME_TAKEN')
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(['username'])
  })

  it('cadastros simultâneos com o mesmo e-mail: só um 201, o outro 409', async () => {
    const results = await Promise.all([
      call('POST', '/auth/register', NEW_USER),
      call('POST', '/auth/register', { ...NEW_USER, username: 'carla.outra' }),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([201, 409])
    expect(getDb().users.filter((u) => u.email === NEW_USER.email)).toHaveLength(1)
  })

  it('422 com fieldErrors para usuário vazio, e-mail inválido e senha fora da Q-27', async () => {
    for (const password of ['curta1', 'semnumeros', '12345678']) {
      const res = await call('POST', '/auth/register', { ...NEW_USER, password })
      expect(res.status).toBe(422)
      expect(Object.keys((await errorOf(res)).fieldErrors ?? {})).toEqual(['password'])
    }
    const res = await call('POST', '/auth/register', { username: ' ', email: 'x@', password: '' })
    expect((await errorOf(res)).fieldErrors).toEqual({
      username: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
    })
  })
})

describe('POST /auth/login', () => {
  beforeEach(() => {
    resetDb()
    activateScenario('default')
  })

  it('200 com credenciais válidas', async () => {
    const res = await call('POST', '/auth/login', ANA)
    expect(res.status).toBe(200)
    const body = (await res.json()) as AuthResponse
    expect(body.user.id).toBe('user-001')
    expect(body.user).not.toHaveProperty('passwordHash')
  })

  it('RN-15: resposta do login e da sessão não contém senha, hash nem salt', async () => {
    const res = await call('POST', '/auth/login', ANA)
    const text = JSON.stringify(await res.json())
    expect(text).not.toContain(ANA.password)
    expect(text).not.toMatch(/passwordHash|salt/)
  })

  it('401 INVALID_CREDENTIALS idêntico para e-mail inexistente e senha errada', async () => {
    const unknown = await call('POST', '/auth/login', { ...ANA, email: 'zz@kurio.test' })
    const wrong = await call('POST', '/auth/login', { ...ANA, password: 'Errada123' })
    expect([unknown.status, wrong.status]).toEqual([401, 401])
    const [a, b] = await Promise.all([errorOf(unknown), errorOf(wrong)])
    expect(a).toEqual(b)
    expect(a.code).toBe('INVALID_CREDENTIALS')
    expect(a.fieldErrors).toBeUndefined()
  })

  it('funde o carrinho do visitante, limita ao disponível e apaga o do visitante', async () => {
    const nft = getDb().nfts.find((n) => n.editions.some((e) => e.available >= 2))!
    const edition = nft.editions.find((e) => e.available >= 2)!
    const guest = { 'X-Guest-Cart-Id': 'guest-m' }
    const line = { nftId: nft.id, editionId: edition.id }
    await call('POST', '/cart/items', { ...line, quantity: edition.available }, guest)

    const first = (await (await call('POST', '/auth/login', ANA)).json()) as AuthResponse
    await call('POST', '/cart/items', { ...line, quantity: 1 }, bearer(first.session.token))

    const res = await call('POST', '/auth/login', { ...ANA, guestCartId: 'guest-m' })
    const body = (await res.json()) as AuthResponse
    expect(body.cartAdjustments).toEqual([
      {
        ...line,
        reason: 'QUANTITY_REDUCED',
        previousQuantity: edition.available + 1,
        currentQuantity: edition.available,
      },
    ])
    const cart = (await (
      await call('GET', '/cart', undefined, bearer(body.session.token))
    ).json()) as Cart
    expect(cart.items).toMatchObject([{ ...line, quantity: edition.available }])
    expect(getDb().carts.some((c) => c.owner === 'guest:guest-m')).toBe(false)
  })
})

describe('GET /auth/session e POST /auth/logout (S-04)', () => {
  beforeEach(() => {
    resetDb()
    activateScenario('S-04')
  })

  const login = async () =>
    ((await (await call('POST', '/auth/login', ANA)).json()) as AuthResponse).session.token

  it('responde o usuário com token válido e 401 SESSION_EXPIRED após expireSession', async () => {
    const token = await login()
    const ok = await call('GET', '/auth/session', undefined, bearer(token))
    expect(ok.status).toBe(200)
    expect(((await ok.json()) as SessionResponse).user.id).toBe('user-001')

    expireSessions()
    const expired = await call('GET', '/auth/session', undefined, bearer(token))
    expect(expired.status).toBe(401)
    expect((await errorOf(expired)).code).toBe('SESSION_EXPIRED')

    const unknown = await call('GET', '/auth/session', undefined, bearer('desconhecido'))
    expect((await errorOf(unknown)).code).toBe('UNAUTHENTICATED')
  })

  it('logout remove a sessão e é idempotente', async () => {
    const token = await login()
    expect((await call('POST', '/auth/logout', undefined, bearer(token))).status).toBe(204)
    expect(getDb().sessions.some((s) => s.token === token)).toBe(false)
    expect((await call('POST', '/auth/logout', undefined, bearer(token))).status).toBe(204)
    expect((await call('POST', '/auth/logout')).status).toBe(204)
    const after = await call('GET', '/auth/session', undefined, bearer(token))
    expect((await errorOf(after)).code).toBe('UNAUTHENTICATED')
  })
})
