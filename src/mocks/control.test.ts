import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@/contracts'
import { applyUrlParams, installMockControl, type MockControl } from './control'
import { getDb, mutateDb } from './db/store'

const pendingOrder: Order = {
  id: 'order-1',
  userId: 'user-001',
  status: 'pending',
  version: 1,
  idempotencyKey: 'key',
  requestFingerprint: 'fp',
  snapshot: {
    lines: [],
    subtotal: '0',
    discount: '0',
    networkFee: '0',
    total: '0',
    network: 'ethereum',
    wallet: { label: 'MetaMask', address: '0x0', provider: 'metamask' },
    collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
  },
  createdAt: '2026-11-26T00:00:00.000Z',
}

function installControl(): MockControl {
  const target: { __kurioMock?: MockControl } = {}
  vi.stubGlobal('window', target)
  installMockControl()
  if (!target.__kurioMock) throw new Error('controle nao instalado')
  return target.__kurioMock
}

beforeEach(() => {
  mutateDb((db) => {
    db.orders = [structuredClone(pendingOrder)]
    db.sessions = [{ token: 't', userId: 'user-001', expiresAt: '2999-01-01T00:00:00.000Z' }]
  })
})

describe('controle sobre pedidos e sessões', () => {
  it('settleOrder liquida o pedido e incrementa a versão', () => {
    installControl().settleOrder('order-1', 'confirmed')
    expect(getDb().orders[0]).toMatchObject({ status: 'confirmed', version: 2 })
    expect(getDb().orders[0]?.settledAt).toBeDefined()
  })

  it('settleOrder ignora pedido inexistente', () => {
    installControl().settleOrder('nope', 'rejected')
    expect(getDb().orders[0]?.status).toBe('pending')
  })

  it('listOrders devolve os pedidos do banco', () => {
    expect(installControl().listOrders()).toEqual([pendingOrder])
  })

  it('expireSession expira todas as sessões', () => {
    installControl().expireSession()
    expect(Date.parse(getDb().sessions[0]?.expiresAt ?? '')).toBeLessThan(Date.now())
  })
})

describe('applyUrlParams', () => {
  const store = new Map<string, string>()
  const replaceState = vi.fn()

  function load(search: string): void {
    vi.stubGlobal('window', {
      location: { href: `http://localhost/${search}` },
      history: { replaceState },
    })
    vi.stubGlobal('localStorage', {
      get length() {
        return store.size
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    applyUrlParams()
  }

  beforeEach(() => {
    store.clear()
    replaceState.mockClear()
  })

  it('?scenario persiste o cenário e limpa a URL mantendo panel', () => {
    load('?scenario=S-01&panel=0')
    expect(getDb().meta.scenario).toBe('S-01')
    expect(JSON.parse(store.get('kurio-mock:meta') ?? '{}')).toMatchObject({ scenario: 'S-01' })
    expect(String(replaceState.mock.calls[0]?.[2])).toBe('http://localhost/?panel=0')
  })

  it('cenário desconhecido é ignorado', () => {
    load('?scenario=nao-existe')
    expect(getDb().meta.scenario).not.toBe('nao-existe')
  })

  it('?reset=1 limpa kurio-mock:* e kurio:* e preserva outras chaves', () => {
    store.set('kurio-mock:meta', '{}')
    store.set('kurio:session', '{}')
    store.set('outra', '1')
    load('?reset=1')
    expect([...store.keys()]).toEqual(['outra'])
  })
})
