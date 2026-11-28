import type { OrderStatus } from '@/contracts'

/** Estados do checkout (SDD-08). `confirmed` e `rejected` são terminais. */
export type CheckoutStatus =
  | 'editing'
  | 'reviewing'
  | 'revalidating'
  | 'stale'
  | 'submitting'
  | 'verifying'
  | 'pending'
  | 'confirmed'
  | 'rejected'

/** 4xx definitivos de `POST /orders`: o servidor não criou pedido com esta tentativa. */
export type DefinitiveOrderError = 'QUOTE_STALE' | 'VALIDATION' | 'WALLET_DISCONNECTED'

export interface QuoteRef {
  id: string
  fingerprint: string
}

export interface CheckoutMachineState {
  status: CheckoutStatus
  /** Cotação revisada pelo usuário; a enviada é a revalidada com o mesmo fingerprint. */
  quoteId?: string
  quoteFingerprint?: string
  idempotencyKey?: string
  requestFingerprint?: string
  orderId?: string
}

export type CheckoutEvent =
  | { type: 'EDIT' }
  | { type: 'REVIEW'; quote: QuoteRef }
  | { type: 'CONFIRM' }
  | { type: 'REVALIDATION_FAILED' }
  | { type: 'REVALIDATED'; quote: QuoteRef; idempotencyKey: string; requestFingerprint: string }
  | { type: 'SUBMIT_UNKNOWN' }
  | { type: 'SUBMIT_REJECTED'; code: DefinitiveOrderError }
  | { type: 'ORDER_RECEIVED'; orderId: string; status: OrderStatus }
  | { type: 'ORDER_STATUS'; status: OrderStatus }
  | { type: 'RETRY' }

export const initialCheckoutState: CheckoutMachineState = { status: 'editing' }

const AFTER_DEFINITIVE: Record<DefinitiveOrderError, CheckoutStatus> = {
  QUOTE_STALE: 'stale',
  VALIDATION: 'editing',
  WALLET_DISCONNECTED: 'editing',
}

const REVIEWABLE: ReadonlySet<CheckoutStatus> = new Set(['editing', 'reviewing', 'stale'])
const SENDING: ReadonlySet<CheckoutStatus> = new Set(['submitting', 'verifying'])

/** Campos ficam travados enquanto há tentativa em curso ou pedido criado. */
export const canEditFields = (status: CheckoutStatus): boolean => REVIEWABLE.has(status)

/** Encerra a tentativa: a próxima confirmação gera nova chave (RN-07, ADR 0004). */
function withoutAttempt<S extends CheckoutMachineState>(state: S, status: CheckoutStatus): S {
  const next: S = { ...state, status }
  delete next.idempotencyKey
  delete next.requestFingerprint
  delete next.orderId
  return next
}

/**
 * Reducer puro do SDD-08: evento fora do estado esperado devolve o mesmo objeto. Campos além
 * da máquina (o rascunho) são preservados.
 */
export function checkoutReducer<S extends CheckoutMachineState>(state: S, event: CheckoutEvent): S {
  switch (event.type) {
    case 'EDIT':
      return REVIEWABLE.has(state.status) && state.status !== 'editing'
        ? { ...state, status: 'editing' }
        : state
    case 'REVIEW':
      return REVIEWABLE.has(state.status)
        ? {
            ...state,
            status: 'reviewing',
            quoteId: event.quote.id,
            quoteFingerprint: event.quote.fingerprint,
          }
        : state
    case 'CONFIRM':
      return state.status === 'reviewing' ? { ...state, status: 'revalidating' } : state
    case 'REVALIDATION_FAILED':
      return state.status === 'revalidating' ? { ...state, status: 'reviewing' } : state
    case 'REVALIDATED':
      if (state.status !== 'revalidating') return state
      if (event.quote.fingerprint !== state.quoteFingerprint) return { ...state, status: 'stale' }
      return {
        ...state,
        status: 'submitting',
        quoteId: event.quote.id,
        idempotencyKey: event.idempotencyKey,
        requestFingerprint: event.requestFingerprint,
      }
    case 'SUBMIT_UNKNOWN':
      return SENDING.has(state.status) ? { ...state, status: 'verifying' } : state
    case 'SUBMIT_REJECTED':
      return SENDING.has(state.status) ? withoutAttempt(state, AFTER_DEFINITIVE[event.code]) : state
    case 'ORDER_RECEIVED':
      // L0: o recibo nunca sai da resposta do POST; `confirmed` só pelo GET ou evento.
      return SENDING.has(state.status)
        ? {
            ...state,
            status: event.status === 'confirmed' ? 'pending' : event.status,
            orderId: event.orderId,
          }
        : state
    case 'ORDER_STATUS':
      return state.status === 'pending' && event.status !== 'pending'
        ? { ...state, status: event.status }
        : state
    case 'RETRY':
      return state.status === 'rejected' ? withoutAttempt(state, 'reviewing') : state
  }
}

/**
 * Estado ao restaurar o contexto (refresh/relogin): nada estava em voo, então `submitting`
 * vira `verifying` (reenvia a mesma chave) e revalidação/diff voltam à revisão.
 */
export function resumeCheckout<S extends CheckoutMachineState>(state: S): S {
  switch (state.status) {
    case 'submitting':
      return { ...state, status: 'verifying' }
    case 'revalidating':
    case 'stale':
      return { ...state, status: 'reviewing' }
    default:
      return state
  }
}
