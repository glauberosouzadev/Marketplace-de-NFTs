import { request } from '@/http/client'
import type { AddCartItemRequest, CartResponse } from '@/contracts'

/** Soma à linha existente. Sem sessão, o interceptor do cliente envia `X-Guest-Cart-Id` (lib/storage). */
export function addCartItem(body: AddCartItemRequest): Promise<CartResponse> {
  return request<CartResponse>({ method: 'POST', url: '/cart/items', data: body })
}
