import { describe, expect, it } from 'vitest'
import type { ApiError, Quote } from '@/contracts'
import { errorMessage } from '@/http/error-messages'
import {
  NO_DISCOUNT_TEXT,
  checkoutHref,
  couponErrorMessage,
  discountText,
  hasBlockingIssue,
  issueText,
} from './presentation'

const apiError = (code: ApiError['code']): ApiError => ({
  kind: 'http',
  status: 422,
  code,
  message: 'x',
  fieldErrors: { code: 'x' },
})

const quote: Quote = {
  id: 'q1',
  cartVersion: 1,
  fingerprint: 'f',
  network: 'ethereum',
  lines: [],
  subtotal: '8.92',
  discount: '0.892',
  networkFee: '0.016',
  total: '8.044',
  issues: [],
}

describe('couponErrorMessage', () => {
  it('mapeia o código do erro para mensagens distintas', () => {
    const invalid = couponErrorMessage(apiError('COUPON_INVALID'))
    const expired = couponErrorMessage(apiError('COUPON_EXPIRED'))
    expect(invalid).toBe(errorMessage('COUPON_INVALID'))
    expect(expired).toBe(errorMessage('COUPON_EXPIRED'))
    expect(invalid).not.toBe(expired)
  })

  it('erro desconhecido vira mensagem transitória', () => {
    expect(couponErrorMessage(new Error('boom'))).toBe(errorMessage('TRANSIENT'))
  })
})

describe('discountText', () => {
  it('mostra o desconto da cotação só com cupom aplicado', () => {
    expect(discountText({ ...quote, coupon: { code: 'KURIO10', status: 'applied' } })).toBe(
      '(-) 0.892 ETH',
    )
    expect(discountText({ ...quote, discount: '0' })).toBe(NO_DISCOUNT_TEXT)
    expect(discountText({ ...quote, coupon: { code: 'EXPIRADO20', status: 'expired' } })).toBe(
      NO_DISCOUNT_TEXT,
    )
  })
})

describe('issueText', () => {
  it('descreve cada issue em texto, com o nome do item quando houver', () => {
    expect(issueText({ type: 'SOLD_OUT' }, 'Emerald Ape #042')).toContain('Emerald Ape #042')
    expect(issueText({ type: 'QUANTITY_EXCEEDS' })).toContain('um item do carrinho')
    expect(issueText({ type: 'COUPON_EXPIRED' })).toContain(errorMessage('COUPON_EXPIRED'))
  })
})

describe('checkoutHref', () => {
  it('visitante passa pelo login com redirect; autenticado vai ao pagamento', () => {
    expect(checkoutHref(false)).toBe('/login?redirect=%2Fpagamento')
    expect(checkoutHref(true)).toBe('/pagamento')
  })
})

describe('hasBlockingIssue', () => {
  it('bloqueia com SOLD_OUT ou QUANTITY_EXCEEDS; cupom expirado não bloqueia', () => {
    expect(hasBlockingIssue(quote)).toBe(false)
    expect(hasBlockingIssue({ ...quote, issues: [{ type: 'COUPON_EXPIRED' }] })).toBe(false)
    expect(hasBlockingIssue({ ...quote, issues: [{ type: 'SOLD_OUT' }] })).toBe(true)
    expect(hasBlockingIssue({ ...quote, issues: [{ type: 'QUANTITY_EXCEEDS' }] })).toBe(true)
  })
})
