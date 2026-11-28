import { describe, expect, it } from 'vitest'
import type { CartItem, Quote, QuoteLine } from '@/contracts'
import { blockReason, confirmBlock, isOutdated, isUserDriven, quoteChanges } from './revalidation'

const line = (patch: Partial<QuoteLine> = {}): QuoteLine => ({
  nftId: 'n1',
  editionId: 'e1',
  unitPrice: '1.19',
  quantity: 2,
  lineTotal: '2.38',
  available: 5,
  ...patch,
})

const reviewed: Quote = {
  id: 'q1',
  cartVersion: 1,
  fingerprint: 'fp-a',
  network: 'ethereum',
  lines: [line()],
  subtotal: '2.38',
  discount: '0',
  networkFee: '0.016',
  total: '2.396',
  issues: [],
}

const items = [{ nftId: 'n1', editionId: 'e1', name: 'Emerald Ape' }] as CartItem[]

describe('quoteChanges', () => {
  it('mesmos valores (inclusive com escala diferente) não geram diff', () => {
    const same = { ...reviewed, id: 'q2', total: '2.3960', lines: [line({ unitPrice: '1.190' })] }
    expect(quoteChanges(reviewed, same, items)).toEqual([])
  })

  it('preço alterado mostra anterior → atual da linha e dos valores da cotação', () => {
    const current: Quote = {
      ...reviewed,
      fingerprint: 'fp-b',
      lines: [line({ unitPrice: '1.5', lineTotal: '3' })],
      subtotal: '3',
      total: '3.016',
    }
    expect(quoteChanges(reviewed, current, items)).toEqual([
      {
        id: 'n1:e1:price',
        label: 'Preço de Emerald Ape',
        previous: '1.19 ETH',
        current: '1.5 ETH',
      },
      { id: 'subtotal', label: 'Subtotal', previous: '2.38 ETH', current: '3 ETH' },
      { id: 'total', label: 'Total', previous: '2.396 ETH', current: '3.016 ETH' },
    ])
  })

  it('esgotado, cupom expirado e linha removida aparecem no diff', () => {
    const withCoupon: Quote = { ...reviewed, coupon: { code: 'KURIO10', status: 'applied' } }
    const current: Quote = {
      ...withCoupon,
      lines: [line({ available: 0 }), line({ nftId: 'n2', quantity: 1 })],
      coupon: { code: 'KURIO10', status: 'expired' },
    }
    const changes = quoteChanges(withCoupon, current, items)
    expect(changes).toContainEqual({
      id: 'n1:e1:available',
      label: 'Disponibilidade de Emerald Ape',
      previous: '5 disponíveis',
      current: 'Esgotado',
    })
    expect(changes).toContainEqual({
      id: 'n2:e1:quantity',
      label: 'Quantidade de item',
      previous: '0',
      current: '1',
    })
    expect(changes).toContainEqual({
      id: 'coupon',
      label: 'Cupom',
      previous: 'KURIO10 aplicado',
      current: 'KURIO10 expirado',
    })
  })
})

describe('decisão de revisão', () => {
  it('troca de rede ou de código de cupom é do usuário; expiração não', () => {
    expect(isUserDriven(reviewed, { ...reviewed, network: 'polygon' })).toBe(true)
    const applied: Quote = { ...reviewed, coupon: { code: 'KURIO10', status: 'applied' } }
    expect(isUserDriven(reviewed, applied)).toBe(true)
    expect(
      isUserDriven(applied, { ...applied, coupon: { code: 'KURIO10', status: 'expired' } }),
    ).toBe(false)
  })

  it('fingerprint diferente ou status stale marcam a revisão como desatualizada', () => {
    expect(isOutdated('reviewing', reviewed, { ...reviewed, id: 'q2' })).toBe(false)
    expect(isOutdated('editing', reviewed, { ...reviewed, fingerprint: 'fp-b' })).toBe(true)
    expect(isOutdated('stale', reviewed, reviewed)).toBe(true)
    expect(isOutdated('editing', null, reviewed)).toBe(false)
  })

  it('Confirmar fica travado em curso, desatualizado, sem cotação ou com item esgotado', () => {
    expect(confirmBlock('revalidating', false, reviewed)).toBe('locked')
    expect(confirmBlock('submitting', false, reviewed)).toBe('locked')
    expect(confirmBlock('reviewing', true, reviewed)).toBe('outdated')
    expect(confirmBlock('editing', false, undefined)).toBe('unavailable')
    const soldOut: Quote = {
      ...reviewed,
      issues: [{ type: 'SOLD_OUT', nftId: 'n1', editionId: 'e1' }],
    }
    expect(confirmBlock('editing', false, soldOut)).toBe('issues')
    expect(confirmBlock('reviewing', false, reviewed)).toBeNull()
  })
})

describe('blockReason', () => {
  it('descreve o bloqueio com o texto do motivo, não com o rótulo da lista', () => {
    expect(blockReason('outdated', reviewed, items)).toBe(
      'Os valores mudaram. Revise e confirme novamente.',
    )
    const soldOut: Quote = {
      ...reviewed,
      issues: [{ type: 'SOLD_OUT', nftId: 'n1', editionId: 'e1' }, { type: 'COUPON_EXPIRED' }],
    }
    expect(blockReason('issues', soldOut, items)).toBe(
      'Esgotado: Emerald Ape. Remova o item para continuar.',
    )
    expect(blockReason('locked', reviewed, items)).toBeNull()
    expect(blockReason(null, reviewed, items)).toBeNull()
  })
})
