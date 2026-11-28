import { MutationObserver, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ApiError, Network, OrderResponse, Quote } from '@/contracts'
import { cartQuery } from '@/features/cart/queries'
import { createOrderMutation, type CreateOrderVars } from '@/features/orders/mutations'
import { orderQuery } from '@/features/orders/queries'
import { quoteQuery } from '@/features/quote/queries'
import { isApiError } from '@/http/normalize-error'
import { useRestObserver } from '@/realtime/realtime-provider'
import {
  discardCheckoutDraft,
  loadCheckoutDraft,
  orderRequestOf,
  saveCheckoutDraft,
  type CheckoutDraft,
  type CheckoutFields,
} from './checkout-draft'
import {
  canEditFields,
  checkoutReducer,
  type CheckoutEvent,
  type DefinitiveOrderError,
  type QuoteRef,
} from './checkout-machine'
import { requestFingerprintOf } from './request-fingerprint'

export interface CheckoutSnapshot {
  draft: CheckoutDraft
  /** Último erro do envio ou da revalidação (422 traz `fieldErrors`). */
  error: ApiError | null
}

export interface CheckoutDeps {
  initial: CheckoutDraft
  persist: (draft: CheckoutDraft) => void
  discard: () => void
  revalidateQuote: (network: Network) => Promise<Quote>
  sendOrder: (vars: CreateOrderVars) => Promise<OrderResponse>
  newIdempotencyKey: () => string
}

const DEFINITIVE: ReadonlySet<string> = new Set<DefinitiveOrderError>([
  'QUOTE_STALE',
  'VALIDATION',
  'WALLET_DISCONNECTED',
])

const isDefinitive = (error: ApiError): error is ApiError & { code: DefinitiveOrderError } =>
  error.kind === 'http' && DEFINITIVE.has(error.code)

/**
 * Fora dos 4xx definitivos do SDD-08 (401, 5xx, rede e também `IDEMPOTENCY_CONFLICT`, sobre o
 * qual a spec é silente) o contexto e a chave são preservados.
 */
function submitFailure(error: unknown): CheckoutEvent {
  return isApiError(error) && isDefinitive(error)
    ? { type: 'SUBMIT_REJECTED', code: error.code }
    : { type: 'SUBMIT_UNKNOWN' }
}

/**
 * Liga reducer, contexto persistido e envio. Toda transição é gravada antes de qualquer
 * efeito seguinte, então a chave já está no armazenamento quando o `POST /orders` sai.
 */
export function createCheckoutController(deps: CheckoutDeps) {
  let snapshot: CheckoutSnapshot = { draft: deps.initial, error: null }
  let sending = false
  const listeners = new Set<() => void>()

  function commit(draft: CheckoutDraft, error: ApiError | null = snapshot.error): void {
    if (draft === snapshot.draft && error === snapshot.error) return
    // Confirmado é terminal: o contexto sai para a próxima compra começar limpa.
    if (draft.status === 'confirmed') deps.discard()
    else if (draft !== snapshot.draft) deps.persist(draft)
    snapshot = { draft, error }
    listeners.forEach((l) => l())
  }

  function dispatch(event: CheckoutEvent, error?: ApiError | null): void {
    commit(checkoutReducer(snapshot.draft, event), error)
  }

  async function send(): Promise<void> {
    const { draft } = snapshot
    const body = orderRequestOf(draft)
    if (sending || !draft.idempotencyKey || !body) return
    sending = true
    try {
      const order = await deps.sendOrder({ idempotencyKey: draft.idempotencyKey, body })
      dispatch({ type: 'ORDER_RECEIVED', orderId: order.id, status: order.status }, null)
    } catch (error) {
      dispatch(submitFailure(error), isApiError(error) ? error : null)
      if (!isApiError(error)) return
      // A conexão recusada pelo servidor deixa de valer: a tela volta a pedir a conexão.
      if (error.code === 'WALLET_DISCONNECTED')
        commit({ ...snapshot.draft, connectionId: undefined })
      // 409 QUOTE_STALE não traz a nova cotação: refaz POST /quotes para o diff (TSD-13).
      if (error.code === 'QUOTE_STALE') await deps.revalidateQuote(body.network).catch(() => null)
    } finally {
      sending = false
    }
  }

  /** FR-31: refaz a cotação; fingerprint igual abre a tentativa com chave persistida, senão `stale`. */
  async function revalidate(): Promise<void> {
    const { draft } = snapshot
    const reviewed = orderRequestOf(draft)
    if (draft.status !== 'reviewing' || !reviewed) return
    dispatch({ type: 'CONFIRM' }, null)
    let quote: Quote
    try {
      quote = await deps.revalidateQuote(reviewed.network)
    } catch (error) {
      dispatch({ type: 'REVALIDATION_FAILED' }, isApiError(error) ? error : null)
      return
    }
    const body = { ...reviewed, quoteId: quote.id, quoteFingerprint: quote.fingerprint }
    dispatch({
      type: 'REVALIDATED',
      quote,
      idempotencyKey: deps.newIdempotencyKey(),
      requestFingerprint: await requestFingerprintOf(body),
    })
  }

  async function confirm(): Promise<void> {
    await revalidate()
    if (snapshot.draft.status === 'submitting') await send()
  }

  return {
    getSnapshot: (): CheckoutSnapshot => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    updateFields(patch: Partial<CheckoutFields>): void {
      if (canEditFields(snapshot.draft.status)) commit({ ...snapshot.draft, ...patch })
    },
    review: (quote: QuoteRef): void => dispatch({ type: 'REVIEW', quote }),
    edit: (): void => dispatch({ type: 'EDIT' }),
    confirm,
    /** Reenvio com a mesma chave (resultado desconhecido ou contexto restaurado). */
    resend: (): Promise<void> =>
      snapshot.draft.status === 'verifying' ? send() : Promise.resolve(),
    retry: (): void => dispatch({ type: 'RETRY' }, null),
    applyOrder(order: OrderResponse): void {
      if (order.id === snapshot.draft.orderId)
        dispatch({ type: 'ORDER_STATUS', status: order.status })
    },
  }
}

export type CheckoutController = ReturnType<typeof createCheckoutController>

interface ControllerEntry {
  uid: string
  controller: CheckoutController
}

/** O controller pertence a um usuário: troca de `uid` cria outro, com o contexto dele. */
export const controllerForUid = (
  entry: ControllerEntry,
  uid: string,
  create: (uid: string) => CheckoutController,
): ControllerEntry => (entry.uid === uid ? entry : { uid, controller: create(uid) })

/** Contexto do checkout do usuário logado (SDD-07, SDD-08); sem UI. */
export function useCheckout(uid: string) {
  const client = useQueryClient()
  const observer = useRestObserver()
  const create = (owner: string): CheckoutController =>
    createCheckoutController({
      initial: loadCheckoutDraft(owner),
      persist: (draft) => saveCheckoutDraft(owner, draft),
      discard: () => discardCheckoutDraft(owner),
      revalidateQuote: async (network) => {
        const scope = ['user', owner] as const
        const cart = await client.fetchQuery(cartQuery(scope))
        return client.fetchQuery(quoteQuery(scope, cart, network))
      },
      sendOrder: (vars) =>
        new MutationObserver(client, createOrderMutation(client, owner, observer)).mutate(vars),
      newIdempotencyKey: () => crypto.randomUUID(),
    })
  const [entry, setEntry] = useState(() => ({ uid, controller: create(uid) }))
  const current = controllerForUid(entry, uid, create)
  // Ajuste de estado durante o render (padrão do React para derivar de props).
  if (current !== entry) setEntry(current)
  const { controller } = current
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const { orderId } = snapshot.draft

  // Refresh/relogin durante o envio: reenvia a mesma chave e recupera o mesmo pedido (RN-07).
  useEffect(() => {
    void controller.resend()
  }, [controller])

  // FR-34: GET no mount; reconexão e `order.updated` atualizam este cache, sem polling.
  const order = useQuery({
    ...orderQuery(uid, orderId ?? '', observer),
    enabled: orderId !== undefined,
  })
  // O cache já pode ter o corpo do POST; só GET ou evento após o mount valem (L0).
  const { data: fetched, isFetchedAfterMount } = order
  useEffect(() => {
    if (fetched && isFetchedAfterMount) controller.applyOrder(fetched)
  }, [controller, fetched, isFetchedAfterMount])

  return { ...snapshot, order, controller }
}
