import { describe, expect, it } from 'vitest'
import type { CreateOrderRequest } from '@/contracts'
import { requestFingerprintOf } from './request-fingerprint'

const request: CreateOrderRequest = {
  quoteId: 'q1',
  quoteFingerprint: 'fp',
  walletId: 'w1',
  connectionId: 'c1',
  network: 'ethereum',
  collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
}

describe('requestFingerprintOf', () => {
  // Mesmo vetor de src/mocks/db/orders.test.ts: prende o hash do cliente ao do mock.
  it('vetor fixo compartilhado com o mock', async () => {
    const vector = { ...request, collector: { ...request.collector, note: 'oi' } }
    expect(await requestFingerprintOf(vector)).toBe(
      'eb9da298229c53cd8b45a182fd2b7cf80392b08963b50cf477b26c32a67a6d5a',
    )
  })

  it('é estável e não depende da ordem das chaves do colecionador', async () => {
    const reordered = {
      ...request,
      collector: { email: 'ana@kurio.test', profileName: 'ana', displayName: 'Ana' },
    }
    expect(await requestFingerprintOf(reordered)).toBe(await requestFingerprintOf(request))
  })

  it('muda com carteira, conexão, rede ou dados, mas não com o fingerprint da cotação', async () => {
    const base = await requestFingerprintOf(request)
    expect(await requestFingerprintOf({ ...request, quoteFingerprint: 'outro' })).toBe(base)
    for (const changed of [
      { ...request, walletId: 'w2' },
      { ...request, connectionId: 'c2' },
      { ...request, network: 'polygon' as const },
      { ...request, collector: { ...request.collector, note: 'x' } },
    ]) {
      expect(await requestFingerprintOf(changed)).not.toBe(base)
    }
  })
})
