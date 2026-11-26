import type { MockCoupon } from '../db/types'

/** Válido: KURIO10. Expirado: EXPIRADO20. Inválido: PAUSADO15 (inativo); códigos desconhecidos também são inválidos. */
export const COUPONS: readonly MockCoupon[] = [
  { code: 'KURIO10', discountBps: 1000, expiresAt: '2099-12-31T23:59:59.000Z', active: true },
  { code: 'EXPIRADO20', discountBps: 2000, expiresAt: '2020-01-01T00:00:00.000Z', active: true },
  { code: 'PAUSADO15', discountBps: 1500, expiresAt: '2099-12-31T23:59:59.000Z', active: false },
]
