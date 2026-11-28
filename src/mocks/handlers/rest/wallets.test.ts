import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrorEnvelope, Wallet, WalletConnection, WalletsResponse } from '@/contracts'
import { installMockControl, type MockControl } from '../../control'
import { getDb, mutateDb, resetDb } from '../../db/store'
import { activateScenario } from '../../scenarios/active'
import { apiUrl } from '../util'
import { restHandlers } from '.'

vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/v1'))

const server = setupServer(...restHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => vi.unstubAllGlobals())

const VALID = {
  displayName: 'Ana',
  nickname: 'Principal',
  profileName: 'ana',
  email: 'ana@kurio.test',
  provider: 'metamask',
  network: 'ethereum',
  address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  ensName: 'ana.eth',
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

const control = (): MockControl => {
  const target: { __kurioMock?: MockControl } = {}
  vi.stubGlobal('window', target)
  installMockControl()
  return target.__kurioMock!
}

describe('GET /me/wallets', () => {
  it('devolve só as carteiras do usuário', async () => {
    const ana = (await (await call('GET', '/me/wallets', 'tok-ana')).json()) as WalletsResponse
    expect([ana.primary?.id, ana.secondary?.id]).toEqual(['wallet-001', 'wallet-002'])
    const bruno = (await (await call('GET', '/me/wallets', 'tok-bruno')).json()) as WalletsResponse
    expect([bruno.primary?.id, bruno.secondary]).toEqual(['wallet-003', null])
  })

  it('401 sem sessão', async () => {
    expect((await call('GET', '/me/wallets')).status).toBe(401)
  })
})

describe('PUT /me/wallets/:slot', () => {
  it('faz upsert e persiste no banco', async () => {
    const res = await call('PUT', '/me/wallets/primary', 'tok-ana', { ...VALID, referralCode: '' })
    expect(res.status).toBe(200)
    expect(((await res.json()) as Wallet).nickname).toBe('Principal')
    const stored = getDb().wallets.find((w) => w.id === 'wallet-001')
    expect(stored?.nickname).toBe('Principal')
    expect(stored).not.toHaveProperty('referralCode')
  })

  it('endereço inválido para a rede devolve 422 em fieldErrors.address', async () => {
    const res = await call('PUT', '/me/wallets/primary', 'tok-ana', { ...VALID, network: 'solana' })
    expect(res.status).toBe(422)
    const body = (await res.json()) as ErrorEnvelope
    expect(body.code).toBe('VALIDATION')
    expect(Object.keys(body.fieldErrors ?? {})).toEqual(['address'])
  })

  it('obrigatórios vazios devolvem 422 por campo', async () => {
    const res = await call('PUT', '/me/wallets/secondary', 'tok-ana', {
      ...VALID,
      nickname: '',
      ensName: ' ',
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as ErrorEnvelope
    expect(Object.keys(body.fieldErrors ?? {}).sort()).toEqual(['ensName', 'nickname'])
  })

  it('slot inexistente devolve 404 e sem sessão 401', async () => {
    expect((await call('PUT', '/me/wallets/tertiary', 'tok-ana', VALID)).status).toBe(404)
    expect((await call('PUT', '/me/wallets/primary', undefined, VALID)).status).toBe(401)
  })
})

describe('POST /wallet-connections', () => {
  const body = { walletId: 'wallet-001', provider: 'metamask', network: 'ethereum' }

  it('201 connected por padrão e rejected após rejectNextConnection', async () => {
    const ok = await call('POST', '/wallet-connections', 'tok-ana', body)
    expect(ok.status).toBe(201)
    expect(((await ok.json()) as WalletConnection).status).toBe('connected')
    control().rejectNextConnection()
    const refused = await call('POST', '/wallet-connections', 'tok-ana', body)
    expect(refused.status).toBe(201)
    expect(((await refused.json()) as WalletConnection).status).toBe('rejected')
  })

  it('404 para carteira alheia ou inexistente', async () => {
    expect((await call('POST', '/wallet-connections', 'tok-bruno', body)).status).toBe(404)
    const missing = { ...body, walletId: 'wallet-999' }
    expect((await call('POST', '/wallet-connections', 'tok-ana', missing)).status).toBe(404)
  })

  it('422 sem provedor ou rede válidos', async () => {
    const res = await call('POST', '/wallet-connections', 'tok-ana', { walletId: 'wallet-001' })
    expect(res.status).toBe(422)
  })
})

describe('desconexão', () => {
  const status = () => getDb().walletConnections.find((c) => c.id === 'conn-001')?.status

  it('DELETE marca disconnected e responde 204', async () => {
    expect((await call('DELETE', '/wallet-connections/conn-001', 'tok-ana')).status).toBe(204)
    expect(status()).toBe('disconnected')
  })

  it('DELETE de conexão alheia devolve 404 e não altera', async () => {
    expect((await call('DELETE', '/wallet-connections/conn-001', 'tok-bruno')).status).toBe(404)
    expect(status()).toBe('connected')
  })

  it('disconnectWallet marca disconnected', () => {
    control().disconnectWallet('conn-001')
    expect(status()).toBe('disconnected')
  })
})
