import type {
  Cart,
  CartItem,
  Network,
  Quote,
  QuoteCoupon,
  QuoteIssue,
  QuoteLine,
} from '@/contracts'
import { add, applyBps, mulInt, parse, sub, toString, ZERO } from '@/contracts/decimal'
import { NETWORK_FEES } from '../fixtures/networks'
import type { DbState, MockCoupon } from './types'

export type CouponStatus = QuoteCoupon['status']

export interface CouponCheck {
  status: CouponStatus
  coupon?: MockCoupon
}

export function checkCoupon(
  coupons: readonly MockCoupon[],
  code: string,
  now: number,
): CouponCheck {
  const coupon = coupons.find((c) => c.code === code)
  if (!coupon || !coupon.active) return { status: 'invalid' }
  if (Date.parse(coupon.expiresAt) <= now) return { status: 'expired', coupon }
  return { status: 'applied', coupon }
}

function lineIssue(item: CartItem, available: number): QuoteIssue | undefined {
  const ref = { nftId: item.nftId, editionId: item.editionId }
  if (available === 0) return { type: 'SOLD_OUT', ...ref }
  if (item.quantity > available) return { type: 'QUANTITY_EXCEEDS', ...ref }
  return undefined
}

/** Preço e disponibilidade vêm do NFT atual, não do snapshot gravado no carrinho. */
function toQuoteLine(db: DbState, item: CartItem): QuoteLine {
  const edition = db.nfts
    .find((n) => n.id === item.nftId)
    ?.editions.find((e) => e.id === item.editionId)
  const unitPrice = edition?.price ?? item.unitPrice
  const available = edition?.available ?? 0
  const issue = lineIssue(item, available)
  return {
    nftId: item.nftId,
    editionId: item.editionId,
    unitPrice,
    quantity: item.quantity,
    lineTotal: toString(mulInt(parse(unitPrice), item.quantity)),
    available,
    ...(issue ? { issue } : {}),
  }
}

const byLineKey = (a: QuoteLine, b: QuoteLine): number =>
  a.nftId === b.nftId ? a.editionId.localeCompare(b.editionId) : a.nftId.localeCompare(b.nftId)

interface FingerprintInput {
  lines: QuoteLine[]
  coupon: QuoteCoupon | undefined
  network: Network
  networkFee: string
}

/** JSON canônico: chaves em ordem fixa, linhas já ordenadas por (nftId, editionId). */
function canonicalJson({ lines, coupon, network, networkFee }: FingerprintInput): string {
  return JSON.stringify({
    lines: lines.map((l) => [l.nftId, l.editionId, l.unitPrice, l.quantity, l.available]),
    coupon: coupon ? [coupon.code, coupon.status] : null,
    network,
    networkFee,
  })
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const fingerprintOf = (input: FingerprintInput): Promise<string> =>
  sha256Hex(canonicalJson(input))

export async function buildQuote(
  db: DbState,
  cart: Cart,
  network: Network,
  now: number = Date.now(),
): Promise<Quote> {
  const lines = cart.items.map((item) => toQuoteLine(db, item)).sort(byLineKey)
  const issues: QuoteIssue[] = lines.flatMap((l) => (l.issue ? [l.issue] : []))
  const subtotal = lines.reduce((sum, l) => add(sum, parse(l.lineTotal)), ZERO)

  let discount = ZERO
  let coupon: QuoteCoupon | undefined
  if (cart.couponCode) {
    const check = checkCoupon(db.coupons, cart.couponCode, now)
    coupon = { code: cart.couponCode, status: check.status }
    if (check.status === 'applied' && check.coupon) {
      discount = applyBps(subtotal, check.coupon.discountBps)
    }
    if (check.status === 'expired') issues.push({ type: 'COUPON_EXPIRED' })
  }

  const fee = lines.length === 0 ? ZERO : parse(NETWORK_FEES[network])
  const networkFee = toString(fee)
  const fingerprint = await fingerprintOf({ lines, coupon, network, networkFee })
  return {
    id: `quote-${crypto.randomUUID()}`,
    cartVersion: cart.version,
    fingerprint,
    network,
    lines,
    subtotal: toString(subtotal),
    discount: toString(discount),
    networkFee,
    total: toString(add(sub(subtotal, discount), fee)),
    ...(coupon ? { coupon } : {}),
    issues,
  }
}
