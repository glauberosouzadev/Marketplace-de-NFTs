import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { CreateOrderRequest, OrderResponse } from '@/contracts'
import { createOrder } from '@/http/endpoints/orders'
import { isApiError } from '@/http/normalize-error'
import { useRestObserver } from '@/realtime/realtime-provider'
import type { OrderObserver } from './queries'

export const CREATE_ORDER_RETRY_LIMIT = 2

export interface CreateOrderVars {
  idempotencyKey: string
  body: CreateOrderRequest
}

/** Só resultado desconhecido (rede, timeout, 5xx) reenvia; 4xx é definitivo (SDD-08). */
export function shouldRetryCreateOrder(failureCount: number, error: unknown): boolean {
  return (
    isApiError(error) &&
    error.code === 'TRANSIENT' &&
    error.kind !== 'canceled' &&
    failureCount < CREATE_ORDER_RETRY_LIMIT
  )
}

/** O retry do Query repete as mesmas variáveis, logo a mesma `Idempotency-Key`. */
export const createOrderMutation = (client: QueryClient, uid: string, observer: OrderObserver) => ({
  mutationFn: ({ idempotencyKey, body }: CreateOrderVars): Promise<OrderResponse> =>
    createOrder(body, idempotencyKey),
  retry: shouldRetryCreateOrder,
  onSuccess: (order: OrderResponse) => {
    observer.observeOrder(order)
    // Um `order.updated` mais novo pode ter chegado antes da resposta do POST.
    client.setQueryData<OrderResponse>(queryKeys.order(uid, order.id), (prev) =>
      prev && prev.version >= order.version ? prev : order,
    )
  },
})

export function useCreateOrderMutation(uid: string) {
  return useMutation(createOrderMutation(useQueryClient(), uid, useRestObserver()))
}
