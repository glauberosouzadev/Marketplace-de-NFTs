import { beforeEach, describe, expect, it } from 'vitest'
import type { Cart, Edition, Nft } from '@/contracts'
import { toCartItem } from './cart'
import { mergeGuestCart } from './merge-cart'
import { buildSeed } from './seed'
import type { DbState } from './types'

let db: DbState
let nft: Nft
let edition: Edition

const cart = (owner: Cart['owner'], items: Cart['items']): Cart => ({
  id: `cart-${owner}`,
  owner,
  items,
  version: 3,
})

const userCart = () => db.carts.find((c) => c.owner === 'user:user-001')

beforeEach(() => {
  db = buildSeed()
  nft = db.nfts.find((n) => n.editions.some((e) => e.available >= 3))!
  edition = nft.editions.find((e) => e.available >= 3)!
  edition.available = 3
})

describe('mergeGuestCart', () => {
  it('soma quantidades da mesma linha sem ajuste quando cabe no disponível', () => {
    db.carts.push(
      cart('guest:g1', [toCartItem(nft, edition, 1)]),
      cart('user:user-001', [toCartItem(nft, edition, 2)]),
    )
    expect(mergeGuestCart(db, 'g1', 'user-001')).toEqual([])
    expect(userCart()).toMatchObject({ version: 4, items: [{ quantity: 3 }] })
    expect(db.carts.some((c) => c.owner === 'guest:g1')).toBe(false)
  })

  it('limita ao disponível e reporta QUANTITY_REDUCED', () => {
    db.carts.push(
      cart('guest:g1', [toCartItem(nft, edition, 2)]),
      cart('user:user-001', [toCartItem(nft, edition, 2)]),
    )
    expect(mergeGuestCart(db, 'g1', 'user-001')).toEqual([
      {
        nftId: nft.id,
        editionId: edition.id,
        reason: 'QUANTITY_REDUCED',
        previousQuantity: 4,
        currentQuantity: 3,
      },
    ])
    expect(userCart()?.items[0]?.quantity).toBe(3)
  })

  it('cria o carrinho do usuário e não inclui linha esgotada (SOLD_OUT)', () => {
    db.carts.push(cart('guest:g1', [toCartItem(nft, edition, 1)]))
    edition.available = 0
    expect(mergeGuestCart(db, 'g1', 'user-001')).toEqual([
      {
        nftId: nft.id,
        editionId: edition.id,
        reason: 'SOLD_OUT',
        previousQuantity: 1,
        currentQuantity: 0,
      },
    ])
    expect(userCart()).toMatchObject({ items: [], version: 0 })
    expect(db.carts.some((c) => c.owner === 'guest:g1')).toBe(false)
  })

  it('esgotada: remove também a linha que o usuário já tinha e sobe a versão', () => {
    db.carts.push(
      cart('guest:g1', [toCartItem(nft, edition, 1)]),
      cart('user:user-001', [toCartItem(nft, edition, 2)]),
    )
    edition.available = 0
    expect(mergeGuestCart(db, 'g1', 'user-001')).toEqual([
      {
        nftId: nft.id,
        editionId: edition.id,
        reason: 'SOLD_OUT',
        previousQuantity: 3,
        currentQuantity: 0,
      },
    ])
    expect(userCart()).toMatchObject({ items: [], version: 4 })
  })

  it('remove linha de NFT inexistente com REMOVED', () => {
    db.carts.push(cart('guest:g1', [{ ...toCartItem(nft, edition, 1), nftId: 'nft-x' }]))
    expect(mergeGuestCart(db, 'g1', 'user-001')).toEqual([
      {
        nftId: 'nft-x',
        editionId: edition.id,
        reason: 'REMOVED',
        previousQuantity: 1,
        currentQuantity: 0,
      },
    ])
  })

  it('sem carrinho de visitante não altera nada', () => {
    const before = structuredClone(db.carts)
    expect(mergeGuestCart(db, 'inexistente', 'user-001')).toEqual([])
    expect(db.carts).toEqual(before)
  })
})
