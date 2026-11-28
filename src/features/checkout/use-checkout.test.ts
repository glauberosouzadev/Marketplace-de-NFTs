import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiError, Order, OrderResponse, Quote } from '@/contracts'
import type { CreateOrderVars } from '@/features/orders/mutations'
import { getCheckoutDraft } from '@/lib/storage'

vi.mock('@/http/client', () => ({ request: vi.fn() }))

import {
  discardCheckoutDraft,
  loadCheckoutDraft,
  parseCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from './checkout-draft'
import { controllerForUid, createCheckoutController } from './use-checkout'

const UID = 'u-1'
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

const reviewing: CheckoutDraft = {
  status: 'reviewing',
  quoteId: 'q1',
  quoteFingerprint: 'fp-a',
  walletId: 'w1',
  provider: 'metamask',
  network: 'ethereum',
  connectionId: 'c1',
  collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
}
const quote = (fingerprint = 'fp-a') => ({ id: 'q2', fingerprint }) as Quote
const order = (status: Order['status'] = 'pending') =>
  ({ id: 'o1', status, version: 1 }) as OrderResponse
const http = (status: number, code: ApiError['code']): ApiError => ({
  kind: 'http',
  status,
  code,
  message: code,
})
const transient: ApiError = { kind: 'timeout', code: 'TRANSIENT', message: 'timeout' }

function setup(initial: CheckoutDraft = reviewing, fingerprint = 'fp-a') {
  const sendOrder = vi.fn<(vars: CreateOrderVars) => Promise<OrderResponse>>()
  let keys = 0
  const controller = createCheckoutController({
    initial,
    persist: (draft) => saveCheckoutDraft(UID, draft),
    discard: () => discardCheckoutDraft(UID),
    revalidateQuote: () => Promise.resolve(quote(fingerprint)),
    sendOrder,
    newIdempotencyKey: () => `key-${++keys}`,
  })
  const stored = () => parseCheckoutDraft(getCheckoutDraft(UID), UID)
  return { controller, sendOrder, stored }
}

describe('createCheckoutController', () => {
  it('grava a chave no contexto antes do POST /orders', async () => {
    const { controller, sendOrder, stored } = setup()
    sendOrder.mockImplementation(({ idempotencyKey }) => {
      expect(stored()).toMatchObject({ status: 'submitting', idempotencyKey })
      return Promise.resolve(order())
    })
    await controller.confirm()
    expect(sendOrder).toHaveBeenCalledWith({
      idempotencyKey: 'key-1',
      body: expect.objectContaining({ quoteId: 'q2', quoteFingerprint: 'fp-a' }),
    })
    expect(stored()).toMatchObject({ status: 'pending', orderId: 'o1', idempotencyKey: 'key-1' })
  })

  it('clique repetido em Confirmar gera um único envio', async () => {
    const { controller, sendOrder } = setup()
    sendOrder.mockResolvedValue(order())
    await Promise.all([controller.confirm(), controller.confirm()])
    expect(sendOrder).toHaveBeenCalledTimes(1)
  })

  it('refresh com pedido pendente conhecido não reenvia nem cria outro pedido', async () => {
    saveCheckoutDraft(UID, {
      ...reviewing,
      status: 'pending',
      idempotencyKey: 'key-old',
      requestFingerprint: 'req',
      orderId: 'o1',
    })
    const { controller, sendOrder } = setup(loadCheckoutDraft(UID))
    await controller.resend()
    await controller.confirm()
    expect(sendOrder).not.toHaveBeenCalled()
    controller.applyOrder(order('rejected'))
    expect(controller.getSnapshot().draft.status).toBe('rejected')
  })

  it('409 QUOTE_STALE vai a stale e refaz a cotação para o diff', async () => {
    const revalidateQuote = vi.fn(() => Promise.resolve(quote()))
    const sendOrder = vi.fn(() => Promise.reject(http(409, 'QUOTE_STALE')))
    const controller = createCheckoutController({
      initial: reviewing,
      persist: () => undefined,
      discard: () => undefined,
      revalidateQuote,
      sendOrder,
      newIdempotencyKey: () => 'key-1',
    })
    await controller.confirm()
    expect(controller.getSnapshot().draft.status).toBe('stale')
    expect(controller.getSnapshot().error?.code).toBe('QUOTE_STALE')
    expect(revalidateQuote).toHaveBeenCalledTimes(2)
    expect(sendOrder).toHaveBeenCalledTimes(1)
  })

  it('cotação revalidada diferente vai a stale sem enviar', async () => {
    const { controller, sendOrder, stored } = setup(reviewing, 'fp-b')
    await controller.confirm()
    expect(sendOrder).not.toHaveBeenCalled()
    expect(stored()?.status).toBe('stale')
    expect(stored()?.idempotencyKey).toBeUndefined()
  })

  it('resultado desconhecido vai a verifying e o reenvio usa a mesma chave', async () => {
    const { controller, sendOrder } = setup()
    sendOrder.mockRejectedValueOnce(transient).mockResolvedValueOnce(order())
    await controller.confirm()
    expect(controller.getSnapshot().draft.status).toBe('verifying')
    await controller.resend()
    expect(sendOrder.mock.calls.map(([vars]) => vars.idempotencyKey)).toEqual(['key-1', 'key-1'])
    expect(controller.getSnapshot().draft.status).toBe('pending')
  })

  it('refresh durante o envio restaura e reenvia a mesma chave', async () => {
    saveCheckoutDraft(UID, {
      ...reviewing,
      status: 'submitting',
      idempotencyKey: 'key-old',
      requestFingerprint: 'req',
    })
    const { controller, sendOrder } = setup(loadCheckoutDraft(UID))
    sendOrder.mockResolvedValue(order())
    await controller.resend()
    expect(sendOrder).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'key-old' }))
  })

  it('4xx definitivo descarta a chave; a reconfirmação usa uma nova', async () => {
    const { controller, sendOrder } = setup()
    sendOrder.mockRejectedValueOnce(http(409, 'WALLET_DISCONNECTED')).mockResolvedValueOnce(order())
    await controller.confirm()
    const { draft, error } = controller.getSnapshot()
    expect(draft.status).toBe('editing')
    expect(draft.idempotencyKey).toBeUndefined()
    expect(error?.code).toBe('WALLET_DISCONNECTED')
    expect(draft.connectionId).toBeUndefined()

    controller.updateFields({ connectionId: 'c2' })
    controller.review({ id: 'q2', fingerprint: 'fp-a' })
    await controller.confirm()
    expect(sendOrder.mock.calls.map(([vars]) => vars.idempotencyKey)).toEqual(['key-1', 'key-2'])
  })

  it('recusa exige nova tentativa explícita com nova chave', async () => {
    const { controller, sendOrder } = setup()
    sendOrder.mockResolvedValue(order())
    await controller.confirm()
    controller.applyOrder(order('rejected'))
    await controller.confirm()
    expect(sendOrder).toHaveBeenCalledTimes(1)

    controller.retry()
    await controller.confirm()
    expect(sendOrder.mock.calls.map(([vars]) => vars.idempotencyKey)).toEqual(['key-1', 'key-2'])
  })

  it('confirmado é terminal e remove o contexto persistido', async () => {
    const { controller, sendOrder } = setup()
    sendOrder.mockResolvedValue(order())
    await controller.confirm()
    controller.applyOrder(order('confirmed'))
    controller.applyOrder(order('rejected'))
    expect(controller.getSnapshot().draft.status).toBe('confirmed')
    expect(getCheckoutDraft(UID)).toBeNull()
  })

  it('campos travam durante a tentativa e são autosalvos fora dela', async () => {
    const { controller, sendOrder, stored } = setup()
    controller.updateFields({ network: 'polygon' })
    expect(stored()?.network).toBe('polygon')

    sendOrder.mockResolvedValue(order())
    await controller.confirm()
    controller.updateFields({ network: 'solana' })
    expect(controller.getSnapshot().draft.network).toBe('polygon')
  })

  it('IDEMPOTENCY_CONFLICT não gera chave nova: preserva contexto e chave', async () => {
    const { controller, sendOrder, stored } = setup()
    sendOrder.mockRejectedValueOnce(http(409, 'IDEMPOTENCY_CONFLICT'))
    await controller.confirm()
    expect(stored()).toMatchObject({ status: 'verifying', idempotencyKey: 'key-1', quoteId: 'q2' })
    expect(controller.getSnapshot().error?.code).toBe('IDEMPOTENCY_CONFLICT')
  })
})

describe('controllerForUid', () => {
  it('mantém o controller do mesmo usuário e recria com o contexto do novo', () => {
    saveCheckoutDraft('u-2', { ...reviewing, network: 'solana' })
    const create = vi.fn((uid: string) => setup(loadCheckoutDraft(uid)).controller)
    const entry = { uid: UID, controller: create(UID) }
    expect(controllerForUid(entry, UID, create)).toBe(entry)

    const next = controllerForUid(entry, 'u-2', create)
    expect(next.uid).toBe('u-2')
    expect(next.controller).not.toBe(entry.controller)
    expect(next.controller.getSnapshot().draft.network).toBe('solana')
  })
})
