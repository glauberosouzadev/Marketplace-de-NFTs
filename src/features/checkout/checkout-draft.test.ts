import { beforeEach, describe, expect, it } from 'vitest'
import { getCheckoutDraft, setCheckoutDraft } from '@/lib/storage'
import {
  emptyCheckoutDraft,
  loadCheckoutDraft,
  orderRequestOf,
  parseCheckoutDraft,
  saveCheckoutDraft,
  serializeCheckoutDraft,
  type CheckoutDraft,
} from './checkout-draft'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  })
})

const draft: CheckoutDraft = {
  status: 'submitting',
  quoteId: 'q1',
  quoteFingerprint: 'fp',
  idempotencyKey: 'key-1',
  requestFingerprint: 'req-1',
  walletId: 'w1',
  provider: 'metamask',
  network: 'polygon',
  connectionId: 'c1',
  collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test', note: 'oi' },
}

describe('checkout draft', () => {
  it('sem contexto salvo começa em editing, vazio', () => {
    expect(loadCheckoutDraft('u-1')).toEqual(emptyCheckoutDraft())
  })

  it('refresh em submitting restaura a mesma chave em verifying', () => {
    saveCheckoutDraft('u-1', draft)
    expect(loadCheckoutDraft('u-1')).toEqual({ ...draft, status: 'verifying' })
  })

  it('relogin do mesmo usuário restaura carteira, provedor, rede e campos', () => {
    const editing: CheckoutDraft = { ...emptyCheckoutDraft(), walletId: 'w1', network: 'solana' }
    saveCheckoutDraft('u-1', editing)
    expect(loadCheckoutDraft('u-1')).toEqual(editing)
  })

  it('outro usuário não enxerga o contexto alheio', () => {
    saveCheckoutDraft('u-1', draft)
    expect(loadCheckoutDraft('u-2')).toEqual(emptyCheckoutDraft())
  })

  it('contexto com uid de outro usuário ou corrompido é descartado do armazenamento', () => {
    setCheckoutDraft('u-2', serializeCheckoutDraft('u-1', draft))
    expect(loadCheckoutDraft('u-2')).toEqual(emptyCheckoutDraft())
    expect(getCheckoutDraft('u-2')).toBeNull()

    setCheckoutDraft('u-2', '{nao-json')
    expect(loadCheckoutDraft('u-2')).toEqual(emptyCheckoutDraft())
    expect(getCheckoutDraft('u-2')).toBeNull()
  })

  it('chaves desconhecidas (ex.: token) não voltam do armazenamento', () => {
    const raw = JSON.stringify({ ...JSON.parse(serializeCheckoutDraft('u-1', draft)), token: 't' })
    expect(parseCheckoutDraft(raw, 'u-1')).toEqual(draft)
  })

  it('orderRequestOf exige cotação, carteira, conexão e rede', () => {
    expect(orderRequestOf(draft)).toEqual({
      quoteId: 'q1',
      quoteFingerprint: 'fp',
      walletId: 'w1',
      connectionId: 'c1',
      network: 'polygon',
      collector: draft.collector,
    })
    expect(orderRequestOf({ ...draft, network: null })).toBeNull()
    expect(orderRequestOf(emptyCheckoutDraft())).toBeNull()
  })
})
