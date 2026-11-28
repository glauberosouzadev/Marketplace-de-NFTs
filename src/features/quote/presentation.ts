import type { Quote, QuoteIssue, QuoteIssueType } from '@/contracts'
import { loginHref } from '@/contracts/search'
import { errorMessage } from '@/http/error-messages'
import { isApiError } from '@/http/normalize-error'

export const CHECKOUT_PATH = '/pagamento'

/** Texto do Figma para desconto ausente; com cupom aplicado mostra o valor da cotação. */
export const NO_DISCOUNT_TEXT = '(-) 00.00'

export const EMPTY_COUPON_TEXT = 'Digite um código promocional.'

/** COUPON_INVALID e COUPON_EXPIRED têm mensagens distintas na tabela única (TSD-10). */
export const couponErrorMessage = (error: unknown): string =>
  errorMessage(isApiError(error) ? error.code : 'TRANSIENT')

export const discountText = (quote: Quote): string =>
  quote.coupon?.status === 'applied' ? `(-) ${quote.discount} ETH` : NO_DISCOUNT_TEXT

const ISSUE_TEXT: Record<QuoteIssueType, (name: string) => string> = {
  SOLD_OUT: (name) => `Esgotado: ${name}. Remova o item para continuar.`,
  QUANTITY_EXCEEDS: (name) =>
    `A quantidade de ${name} passou do disponível. Ajuste a quantidade para continuar.`,
  PRICE_CHANGED: (name) => `O preço de ${name} mudou. Confira o resumo atualizado.`,
  COUPON_EXPIRED: () => `${errorMessage('COUPON_EXPIRED')} O resumo segue sem desconto.`,
}

export const issueText = (issue: QuoteIssue, name = 'um item do carrinho'): string =>
  ISSUE_TEXT[issue.type](name)

const BLOCKING: ReadonlySet<QuoteIssueType> = new Set(['SOLD_OUT', 'QUANTITY_EXCEEDS'])

export const isBlockingIssue = (issue: QuoteIssue): boolean => BLOCKING.has(issue.type)

/** FR-55: item esgotado ou acima do disponível impede finalizar até o carrinho ser ajustado. */
export const hasBlockingIssue = (quote: Quote): boolean => quote.issues.some(isBlockingIssue)

export const checkoutHref = (authenticated: boolean): string =>
  authenticated ? CHECKOUT_PATH : loginHref(CHECKOUT_PATH)
