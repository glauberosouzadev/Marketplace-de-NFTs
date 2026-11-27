import { beforeEach, describe, expect, it } from 'vitest'
import type { Cart, CartItem } from '@/contracts'
import { NETWORK_FEES } from '../fixtures/networks'
import { buildQuote, checkCoupon } from './quote'
import { getDb, resetDb } from './store'
import type { DbState } from './types'

const NOW = Date.parse('2026-11-27T12:00:00.000Z')

function dbWith(price: string, available: number): DbState {
  const db = structuredClone(getDb())
  const edition = db.nfts[0]!.editions[0]!
  edition.price = price
  edition.available = available
  return db
}

const line = (db: DbState, quantity: number): CartItem => {
  const nft = db.nfts[0]!
  const edition = nft.editions[0]!
  return {
    nftId: nft.id,
    editionId: edition.id,
    quantity,
    name: nft.name,
    image: nft.images[0]!,
    unitPrice: edition.price,
    available: edition.available,
  }
}

const cartOf = (items: CartItem[], couponCode?: string): Cart => ({
  id: 'cart-guest:g',
  owner: 'guest:g',
  items,
  version: 3,
  ...(couponCode ? { couponCode } : {}),
})

beforeEach(() => {
  resetDb()
})

describe('checkCoupon', () => {
  it('distingue aplicado, expirado, inativo e desconhecido', () => {
    const { coupons } = getDb()
    expect(checkCoupon(coupons, 'KURIO10', NOW).status).toBe('applied')
    expect(checkCoupon(coupons, 'EXPIRADO20', NOW).status).toBe('expired')
    expect(checkCoupon(coupons, 'PAUSADO15', NOW).status).toBe('invalid')
    expect(checkCoupon(coupons, 'NADA', NOW).status).toBe('invalid')
  })
})

describe('buildQuote', () => {
  it('soma em decimal exato, aplica 10% e soma a taxa da rede', async () => {
    const db = dbWith('0.1', 5)
    const quote = await buildQuote(db, cartOf([line(db, 3)], 'KURIO10'), 'ethereum', NOW)
    expect(quote).toMatchObject({
      cartVersion: 3,
      network: 'ethereum',
      subtotal: '0.3',
      discount: '0.03',
      networkFee: NETWORK_FEES.ethereum,
      total: '0.2725',
      coupon: { code: 'KURIO10', status: 'applied' },
      issues: [],
    })
    expect(quote.lines[0]).toMatchObject({ unitPrice: '0.1', lineTotal: '0.3', available: 5 })
  })

  it('carrinho vazio: subtotal, taxa e total zero', async () => {
    const quote = await buildQuote(getDb(), cartOf([]), 'polygon', NOW)
    expect(quote).toMatchObject({ subtotal: '0', discount: '0', networkFee: '0', total: '0' })
  })

  it('cupom salvo que expirou: status expired, issue e desconto zero', async () => {
    const db = dbWith('1', 5)
    const quote = await buildQuote(db, cartOf([line(db, 1)], 'EXPIRADO20'), 'ethereum', NOW)
    expect(quote.coupon).toEqual({ code: 'EXPIRADO20', status: 'expired' })
    expect(quote.discount).toBe('0')
    expect(quote.issues).toContainEqual({ type: 'COUPON_EXPIRED' })
  })

  it('marca SOLD_OUT e QUANTITY_EXCEEDS na linha e em issues', async () => {
    const soldOut = dbWith('1', 0)
    const q1 = await buildQuote(soldOut, cartOf([line(soldOut, 1)]), 'ethereum', NOW)
    expect(q1.lines[0]!.issue?.type).toBe('SOLD_OUT')
    expect(q1.issues.map((i) => i.type)).toEqual(['SOLD_OUT'])

    const few = dbWith('1', 2)
    const q2 = await buildQuote(few, cartOf([line(few, 3)]), 'ethereum', NOW)
    expect(q2.lines[0]!.issue).toMatchObject({ type: 'QUANTITY_EXCEEDS', nftId: few.nfts[0]!.id })
  })

  it('fingerprint estável para a mesma entrada e sensível a cada campo', async () => {
    const db = dbWith('0.5', 5)
    const base = await buildQuote(db, cartOf([line(db, 1)]), 'ethereum', NOW)
    const again = await buildQuote(db, cartOf([line(db, 1)]), 'ethereum', NOW)
    expect(again.fingerprint).toBe(base.fingerprint)
    expect(again.id).not.toBe(base.id)
    expect(base.fingerprint).toMatch(/^[0-9a-f]{64}$/)

    const variants = await Promise.all([
      buildQuote(db, cartOf([line(db, 2)]), 'ethereum', NOW),
      buildQuote(db, cartOf([line(db, 1)], 'KURIO10'), 'ethereum', NOW),
      buildQuote(db, cartOf([line(db, 1)]), 'polygon', NOW),
      buildQuote(dbWith('0.6', 5), cartOf([line(db, 1)]), 'ethereum', NOW),
      buildQuote(dbWith('0.5', 4), cartOf([line(db, 1)]), 'ethereum', NOW),
    ])
    for (const v of variants) expect(v.fingerprint).not.toBe(base.fingerprint)
  })
})
