import { request } from '@/http/client'
import type {
  AddCartItemRequest,
  CartResponse,
  CouponRequest,
  UpdateCartItemRequest,
} from '@/contracts'

/** Soma à linha existente. Sem sessão, o interceptor do cliente envia `X-Guest-Cart-Id` (lib/storage). */
export function addCartItem(body: AddCartItemRequest): Promise<CartResponse> {
  return request<CartResponse>({ method: 'POST', url: '/cart/items', data: body })
}

export function getCart(signal: AbortSignal): Promise<CartResponse> {
  return request<CartResponse>({ method: 'GET', url: '/cart', signal })
}

const itemUrl = (nftId: string, editionId: string): string =>
  `/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`

export function updateCartItem(
  nftId: string,
  editionId: string,
  body: UpdateCartItemRequest,
): Promise<CartResponse> {
  return request<CartResponse>({ method: 'PATCH', url: itemUrl(nftId, editionId), data: body })
}

export function removeCartItem(nftId: string, editionId: string): Promise<CartResponse> {
  return request<CartResponse>({ method: 'DELETE', url: itemUrl(nftId, editionId) })
}

export function setCoupon(body: CouponRequest): Promise<CartResponse> {
  return request<CartResponse>({ method: 'PUT', url: '/cart/coupon', data: body })
}

export function clearCoupon(): Promise<CartResponse> {
  return request<CartResponse>({ method: 'DELETE', url: '/cart/coupon' })
}
