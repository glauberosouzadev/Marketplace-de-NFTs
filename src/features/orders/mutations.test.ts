import { MutationObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { ApiError, CreateOrderRequest, Order } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { createOrderMutation, shouldRetryCreateOrder } from './mutations'

const body: CreateOrderRequest = {
  quoteId: 'q1',
  quoteFingerprint: 'fp',
  walletId: 'w1',
  connectionId: 'c1',
  network: 'ethereum',
  collector: { displayName: 'Ana', profileName: 'ana', email: 'ana@kurio.test' },
}
const order = { id: 'o1', userId: 'u-1', status: 'pending', version: 3 } as Order
const transient = (kind: ApiError['kind'], status?: number): ApiError => ({
  kind,
  code: 'TRANSIENT',
  message: 'falha',
  ...(status === undefined ? {} : { status }),
})
const http4xx = (status: number, code: ApiError['code']): ApiError => ({
  kind: 'http',
  status,
  code,
  message: code,
})

beforeEach(() => {
  request.mockReset()
})

describe('shouldRetryCreateOrder', () => {
  it.each([transient('timeout'), transient('network'), transient('http', 503)])(
    'reenvia em resultado desconhecido (%o) até o limite',
    (error) => {
      expect(shouldRetryCreateOrder(0, error)).toBe(true)
      expect(shouldRetryCreateOrder(1, error)).toBe(true)
      expect(shouldRetryCreateOrder(2, error)).toBe(false)
    },
  )

  it.each([
    http4xx(409, 'IDEMPOTENCY_CONFLICT'),
    http4xx(409, 'QUOTE_STALE'),
    http4xx(409, 'WALLET_DISCONNECTED'),
    http4xx(422, 'VALIDATION'),
    transient('canceled'),
    new Error('desconhecido'),
  ])('não reenvia em %o', (error) => {
    expect(shouldRetryCreateOrder(0, error)).toBe(false)
  })
})

describe('createOrderMutation', () => {
  function setup() {
    const client = createQueryClient()
    const observer = { observeOrder: vi.fn() }
    const mutation = new MutationObserver(client, {
      ...createOrderMutation(client, 'u-1', observer),
      retryDelay: 0,
    })
    return { client, observer, mutation }
  }

  it('timeout e 5xx reenviam com a mesma chave; sucesso alimenta reconciliador e cache', async () => {
    request
      .mockRejectedValueOnce(transient('timeout'))
      .mockRejectedValueOnce(transient('http', 500))
      .mockResolvedValueOnce(order)
    const { client, observer, mutation } = setup()
    await expect(mutation.mutate({ idempotencyKey: 'key-1', body })).resolves.toBe(order)
    expect(request).toHaveBeenCalledTimes(3)
    for (const [config] of request.mock.calls) {
      expect(config).toMatchObject({ headers: { 'Idempotency-Key': 'key-1' }, data: body })
    }
    expect(observer.observeOrder).toHaveBeenCalledWith(order)
    expect(client.getQueryData(queryKeys.order('u-1', 'o1'))).toBe(order)
  })

  it('não regride o cache quando um evento mais novo chegou antes da resposta', async () => {
    const confirmed = { ...order, status: 'confirmed', version: 4 } as Order
    request.mockResolvedValue(order)
    const { client, mutation } = setup()
    client.setQueryData(queryKeys.order('u-1', 'o1'), confirmed)
    await mutation.mutate({ idempotencyKey: 'key-1', body })
    expect(client.getQueryData(queryKeys.order('u-1', 'o1'))).toBe(confirmed)
  })

  it.each([http4xx(409, 'IDEMPOTENCY_CONFLICT'), http4xx(409, 'QUOTE_STALE')])(
    '%o não reenvia nem toca o cache',
    async (error) => {
      request.mockRejectedValue(error)
      const { observer, mutation } = setup()
      await expect(mutation.mutate({ idempotencyKey: 'key-1', body })).rejects.toBe(error)
      expect(request).toHaveBeenCalledTimes(1)
      expect(observer.observeOrder).not.toHaveBeenCalled()
    },
  )

  it('422 chega como ApiError com fieldErrors, sem reenvio', async () => {
    const invalid: ApiError = { ...http4xx(422, 'VALIDATION'), fieldErrors: { email: 'Inválido' } }
    request.mockRejectedValue(invalid)
    const { mutation } = setup()
    await expect(mutation.mutate({ idempotencyKey: 'key-1', body })).rejects.toMatchObject({
      kind: 'http',
      status: 422,
      fieldErrors: { email: 'Inválido' },
    })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
