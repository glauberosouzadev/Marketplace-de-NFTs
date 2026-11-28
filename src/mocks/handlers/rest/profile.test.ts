import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrorEnvelope, Profile, WalletsResponse } from '@/contracts'
import { getDb, mutateDb, resetDb } from '../../db/store'
import { activateScenario } from '../../scenarios/active'
import { apiUrl } from '../util'
import { restHandlers } from '.'

vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/v1'))

const server = setupServer(...restHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

const ANA_PASSWORD = 'Kurio@2026'
const VALID = {
  displayName: 'Ana C.',
  username: 'ana.nova',
  email: 'ana.nova@kurio.test',
  ensName: 'ana-nova.eth',
  walletNickname: 'Cofre',
}

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

const call = (method: string, path: string, token?: string, body?: unknown) =>
  fetch(apiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const errorOf = async (res: Response) => (await res.json()) as ErrorEnvelope

describe('GET /me/profile', () => {
  it('devolve o perfil da sessão com o apelido da carteira principal', async () => {
    const res = await call('GET', '/me/profile', 'tok-ana')
    expect(res.status).toBe(200)
    expect((await res.json()) as Profile).toEqual({
      displayName: 'Ana Colecionadora',
      username: 'ana.colecionadora',
      email: 'ana@kurio.test',
      ensName: 'ana.eth',
      walletNickname: 'Carteira principal',
    })
    const bruno = (await (await call('GET', '/me/profile', 'tok-bruno')).json()) as Profile
    expect(bruno.username).toBe('bruno.criador')
  })

  it('401 sem sessão', async () => {
    expect((await call('GET', '/me/profile')).status).toBe(401)
  })
})

describe('PATCH /me/profile', () => {
  it('persiste e o apelido aparece em GET /me/wallets', async () => {
    const res = await call('PATCH', '/me/profile', 'tok-ana', VALID)
    expect(res.status).toBe(200)
    expect(((await res.json()) as Profile).walletNickname).toBe('Cofre')
    const wallets = (await (await call('GET', '/me/wallets', 'tok-ana')).json()) as WalletsResponse
    expect(wallets.primary?.nickname).toBe('Cofre')
    expect(getDb().users.find((u) => u.id === 'user-001')?.version).toBe(2)
  })

  it('409 EMAIL_TAKEN e USERNAME_TAKEN com fieldErrors no campo', async () => {
    const email = await call('PATCH', '/me/profile', 'tok-ana', {
      ...VALID,
      email: 'Bruno@Kurio.test',
    })
    expect(email.status).toBe(409)
    expect(await errorOf(email)).toMatchObject({
      code: 'EMAIL_TAKEN',
      fieldErrors: { email: 'E-mail já cadastrado' },
    })
    const username = await call('PATCH', '/me/profile', 'tok-ana', {
      ...VALID,
      username: 'BRUNO.criador',
    })
    expect(username.status).toBe(409)
    expect(await errorOf(username)).toMatchObject({
      code: 'USERNAME_TAKEN',
      fieldErrors: { username: 'Usuário já em uso' },
    })
  })

  it('422 VALIDATION por campo', async () => {
    const res = await call('PATCH', '/me/profile', 'tok-ana', { ...VALID, displayName: ' ' })
    expect(res.status).toBe(422)
    expect(await errorOf(res)).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { displayName: 'Campo obrigatório' },
    })
  })
})

describe('POST /me/password', () => {
  const login = (password: string) =>
    call('POST', '/auth/login', undefined, { email: 'ana@kurio.test', password })

  it('senha atual errada devolve 422 em currentPassword', async () => {
    const res = await call('POST', '/me/password', 'tok-ana', {
      currentPassword: 'Errada123',
      newPassword: 'Nova12345',
    })
    expect(res.status).toBe(422)
    expect((await errorOf(res)).fieldErrors).toEqual({ currentPassword: 'Senha atual incorreta' })
  })

  it('nova igual à atual devolve 422 em newPassword', async () => {
    const res = await call('POST', '/me/password', 'tok-ana', {
      currentPassword: ANA_PASSWORD,
      newPassword: ANA_PASSWORD,
    })
    expect(res.status).toBe(422)
    expect(Object.keys((await errorOf(res)).fieldErrors ?? {})).toEqual(['newPassword'])
  })

  it('204 e o login passa a aceitar só a senha nova', async () => {
    const res = await call('POST', '/me/password', 'tok-ana', {
      currentPassword: ANA_PASSWORD,
      newPassword: 'Nova12345',
    })
    expect(res.status).toBe(204)
    expect((await login(ANA_PASSWORD)).status).toBe(401)
    expect((await login('Nova12345')).status).toBe(200)
    expect(JSON.stringify(getDb())).not.toContain('Nova12345')
  })
})
