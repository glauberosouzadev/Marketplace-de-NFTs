import { http, HttpResponse } from 'msw'
import { getOrCreateCart, setCartCoupon } from '../../db/cart'
import { checkCoupon } from '../../db/quote'
import { getDb } from '../../db/store'
import { apiUrl, errorResponse, withScenario } from '../util'
import { readBody, resolveOwner } from './cart'

const invalid = (): Response =>
  errorResponse(422, 'COUPON_INVALID', 'Cupom inválido', { code: 'Cupom inválido' })
const expired = (): Response =>
  errorResponse(422, 'COUPON_EXPIRED', 'Cupom expirado', { code: 'Cupom expirado' })

export const couponHandlers = [
  http.put(
    apiUrl('/cart/coupon'),
    withScenario('PUT /cart/coupon', async ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const { code } = await readBody(request)
      const trimmed = typeof code === 'string' ? code.trim() : ''
      if (trimmed === '') return invalid()
      const { status } = checkCoupon(getDb().coupons, trimmed, Date.now())
      if (status === 'invalid') return invalid()
      if (status === 'expired') return expired()
      return HttpResponse.json(setCartCoupon(owner, trimmed))
    }),
  ),
  http.delete(
    apiUrl('/cart/coupon'),
    withScenario('DELETE /cart/coupon', ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const cart = getOrCreateCart(owner)
      return HttpResponse.json(cart.couponCode ? setCartCoupon(owner, undefined) : cart)
    }),
  ),
]
