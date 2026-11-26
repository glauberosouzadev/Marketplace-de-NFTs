/** Códigos do envelope de erro (SDD-04, TSD-13 item 2). */
export type ErrorCode =
  | 'VALIDATION'
  | 'SESSION_EXPIRED'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'AVAILABILITY_CONFLICT'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'QUOTE_STALE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WALLET_DISCONNECTED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'TRANSIENT'

export type FieldErrors = Record<string, string>

/** Envelope devolvido pela API. */
export interface ErrorEnvelope {
  code: ErrorCode
  message: string
  fieldErrors?: FieldErrors
}

/** Erro normalizado no cliente (TSD-03). */
export interface ApiError {
  kind: 'http' | 'network' | 'timeout' | 'canceled'
  status?: number
  code: ErrorCode
  message: string
  fieldErrors?: FieldErrors
}

/** Códigos de erro por endpoint (TSD-03, coluna "Erros"). Chave: `MÉTODO /caminho`. */
export interface EndpointErrors {
  'POST /auth/register': 'VALIDATION' | 'EMAIL_TAKEN' | 'USERNAME_TAKEN'
  'POST /auth/login': 'INVALID_CREDENTIALS' | 'VALIDATION'
  'GET /auth/session': 'UNAUTHENTICATED' | 'SESSION_EXPIRED'
  'POST /auth/logout': never
  'GET /nfts': 'VALIDATION' | 'TRANSIENT'
  'GET /nfts/facets': 'TRANSIENT'
  'GET /nfts/featured': 'TRANSIENT'
  'GET /nfts/:id': 'NOT_FOUND'
  'GET /me/favorites': 'UNAUTHENTICATED' | 'FORBIDDEN'
  'PUT /me/favorites/:nftId': 'UNAUTHENTICATED' | 'NOT_FOUND' | 'TRANSIENT'
  'DELETE /me/favorites/:nftId': 'UNAUTHENTICATED' | 'NOT_FOUND' | 'TRANSIENT'
  'GET /cart': 'UNAUTHENTICATED'
  'POST /cart/items': 'AVAILABILITY_CONFLICT' | 'NOT_FOUND' | 'VALIDATION'
  'PATCH /cart/items/:nftId/:editionId': 'AVAILABILITY_CONFLICT' | 'NOT_FOUND' | 'VALIDATION'
  'DELETE /cart/items/:nftId/:editionId': 'NOT_FOUND'
  'PUT /cart/coupon': 'COUPON_INVALID' | 'COUPON_EXPIRED'
  'DELETE /cart/coupon': 'COUPON_INVALID' | 'COUPON_EXPIRED'
  'POST /quotes': 'UNAUTHENTICATED' | 'TRANSIENT'
  'GET /me/wallets': 'UNAUTHENTICATED' | 'FORBIDDEN'
  'PUT /me/wallets/:slot': 'VALIDATION'
  'POST /wallet-connections': 'VALIDATION' | 'NOT_FOUND'
  'DELETE /wallet-connections/:id': never
  'POST /orders':
    | 'IDEMPOTENCY_CONFLICT'
    | 'QUOTE_STALE'
    | 'WALLET_DISCONNECTED'
    | 'VALIDATION'
    | 'UNAUTHENTICATED'
  'GET /orders/:id': 'NOT_FOUND'
  'GET /me/profile': never
  'PATCH /me/profile': 'VALIDATION' | 'EMAIL_TAKEN' | 'USERNAME_TAKEN'
  'PUT /me/avatar': 'VALIDATION'
  'DELETE /me/avatar': never
  'POST /me/password': 'VALIDATION'
}
