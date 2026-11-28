import { describe, expect, it } from 'vitest'
import {
  checkoutReducer,
  resumeCheckout,
  type CheckoutEvent,
  type CheckoutMachineState,
  type CheckoutStatus,
} from './checkout-machine'

const reviewed = { id: 'q1', fingerprint: 'fp-a' }
const revalidated = (fingerprint = 'fp-a', key = 'k1'): CheckoutEvent => ({
  type: 'REVALIDATED',
  quote: { id: 'q2', fingerprint },
  idempotencyKey: key,
  requestFingerprint: `req-${key}`,
})

const run = (events: CheckoutEvent[], from: CheckoutMachineState = { status: 'editing' }) =>
  events.reduce(checkoutReducer, from)

const submitting = run([{ type: 'REVIEW', quote: reviewed }, { type: 'CONFIRM' }, revalidated()])

describe('checkoutReducer', () => {
  it('editing → reviewing → revalidating → submitting com a chave da tentativa', () => {
    expect(submitting).toEqual({
      status: 'submitting',
      quoteId: 'q2',
      quoteFingerprint: 'fp-a',
      idempotencyKey: 'k1',
      requestFingerprint: 'req-k1',
    })
  })

  it('fingerprint diferente vai a stale sem chave e volta à revisão com a nova cotação', () => {
    const stale = run([
      { type: 'REVIEW', quote: reviewed },
      { type: 'CONFIRM' },
      revalidated('fp-b'),
    ])
    expect(stale.status).toBe('stale')
    expect(stale.idempotencyKey).toBeUndefined()
    const again = checkoutReducer(stale, {
      type: 'REVIEW',
      quote: { id: 'q2', fingerprint: 'fp-b' },
    })
    expect(again).toMatchObject({ status: 'reviewing', quoteFingerprint: 'fp-b' })
  })

  it('Confirmar só sai de reviewing (clique repetido é ignorado)', () => {
    const revalidating = run([{ type: 'CONFIRM' }], { status: 'reviewing' })
    expect(checkoutReducer(revalidating, { type: 'CONFIRM' })).toBe(revalidating)
    expect(checkoutReducer(submitting, { type: 'CONFIRM' })).toBe(submitting)
  })

  it('falha na revalidação volta à revisão', () => {
    expect(run([{ type: 'REVALIDATION_FAILED' }], { status: 'revalidating' }).status).toBe(
      'reviewing',
    )
  })

  it('timeout/rede/5xx vão a verifying mantendo a mesma chave', () => {
    const verifying = run([{ type: 'SUBMIT_UNKNOWN' }, { type: 'SUBMIT_UNKNOWN' }], submitting)
    expect(verifying.status).toBe('verifying')
    expect(verifying.idempotencyKey).toBe('k1')
    const pending = checkoutReducer(verifying, {
      type: 'ORDER_RECEIVED',
      orderId: 'o1',
      status: 'pending',
    })
    expect(pending).toMatchObject({ status: 'pending', orderId: 'o1', idempotencyKey: 'k1' })
  })

  it.each([
    ['QUOTE_STALE', 'stale'],
    ['VALIDATION', 'editing'],
    ['WALLET_DISCONNECTED', 'editing'],
  ] as const)('4xx definitivo %s encerra a tentativa (%s)', (code, status) => {
    const rejected = checkoutReducer(submitting, { type: 'SUBMIT_REJECTED', code })
    expect(rejected.status).toBe(status)
    expect(rejected.idempotencyKey).toBeUndefined()
    expect(rejected.requestFingerprint).toBeUndefined()
  })

  it('após 4xx definitivo a nova chave só nasce com nova confirmação', () => {
    const editing = checkoutReducer(submitting, { type: 'SUBMIT_REJECTED', code: 'VALIDATION' })
    const reviewingAgain = checkoutReducer(editing, { type: 'REVIEW', quote: reviewed })
    expect(reviewingAgain.idempotencyKey).toBeUndefined()
    const next = run([{ type: 'CONFIRM' }, revalidated('fp-a', 'k2')], reviewingAgain)
    expect(next).toMatchObject({ status: 'submitting', idempotencyKey: 'k2' })
  })

  it('pedido recusado exige nova tentativa explícita, que limpa chave e pedido', () => {
    const pending = checkoutReducer(submitting, {
      type: 'ORDER_RECEIVED',
      orderId: 'o1',
      status: 'pending',
    })
    const rejected = checkoutReducer(pending, { type: 'ORDER_STATUS', status: 'rejected' })
    expect(rejected.status).toBe('rejected')
    for (const event of [{ type: 'CONFIRM' }, { type: 'EDIT' }, revalidated()] as CheckoutEvent[]) {
      expect(checkoutReducer(rejected, event)).toBe(rejected)
    }
    const retry = checkoutReducer(rejected, { type: 'RETRY' })
    expect(retry).toEqual({ status: 'reviewing', quoteId: 'q2', quoteFingerprint: 'fp-a' })
  })

  it('replay já confirmado espera o GET/evento; recusado vai direto ao estado real', () => {
    const received = (status: 'confirmed' | 'rejected') =>
      checkoutReducer(submitting, { type: 'ORDER_RECEIVED', orderId: 'o1', status })
    expect(received('confirmed')).toMatchObject({ status: 'pending', orderId: 'o1' })
    expect(received('rejected')).toMatchObject({ status: 'rejected', orderId: 'o1' })
    const confirmed = checkoutReducer(received('confirmed'), {
      type: 'ORDER_STATUS',
      status: 'confirmed',
    })
    expect(confirmed.status).toBe('confirmed')
  })

  it.each<CheckoutStatus>(['confirmed', 'rejected'])('terminal %s não regride', (status) => {
    const terminal: CheckoutMachineState = { status, orderId: 'o1', idempotencyKey: 'k1' }
    const events: CheckoutEvent[] = [
      { type: 'ORDER_STATUS', status: 'pending' },
      { type: 'ORDER_STATUS', status: status === 'confirmed' ? 'rejected' : 'confirmed' },
      { type: 'ORDER_RECEIVED', orderId: 'o1', status: 'pending' },
      { type: 'SUBMIT_UNKNOWN' },
      { type: 'SUBMIT_REJECTED', code: 'VALIDATION' },
      { type: 'REVIEW', quote: reviewed },
    ]
    for (const event of events) expect(checkoutReducer(terminal, event)).toBe(terminal)
  })

  it('pending só avança para terminal', () => {
    const pending: CheckoutMachineState = { status: 'pending', orderId: 'o1' }
    expect(checkoutReducer(pending, { type: 'ORDER_STATUS', status: 'pending' })).toBe(pending)
    expect(checkoutReducer(pending, { type: 'ORDER_STATUS', status: 'confirmed' }).status).toBe(
      'confirmed',
    )
  })
})

describe('resumeCheckout', () => {
  it('submitting restaurado vira verifying com a mesma chave', () => {
    expect(resumeCheckout(submitting)).toEqual({ ...submitting, status: 'verifying' })
  })

  it.each<CheckoutStatus>(['revalidating', 'stale'])('%s volta à revisão', (status) => {
    expect(resumeCheckout({ status }).status).toBe('reviewing')
  })

  it.each<CheckoutStatus>(['editing', 'reviewing', 'verifying', 'pending', 'rejected'])(
    '%s é mantido',
    (status) => {
      const state: CheckoutMachineState = { status }
      expect(resumeCheckout(state)).toBe(state)
    },
  )
})
