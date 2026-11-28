import { request } from '@/http/client'
import type { CreateOrderHeaders, CreateOrderRequest, OrderResponse } from '@/contracts'

/** A chave vem do checkout, que a gera e persiste antes do envio (SDD-08). */
export function createOrder(
  body: CreateOrderRequest,
  idempotencyKey: string,
): Promise<OrderResponse> {
  const headers = { 'Idempotency-Key': idempotencyKey } satisfies CreateOrderHeaders
  return request<OrderResponse>({ method: 'POST', url: '/orders', data: body, headers })
}

export function getOrder(id: string, signal: AbortSignal): Promise<OrderResponse> {
  return request<OrderResponse>({
    method: 'GET',
    url: `/orders/${encodeURIComponent(id)}`,
    signal,
  })
}
