import type { Cart, CartItem, Edition, Nft } from '@/contracts'
import { mutateDb, nextVersion } from './store'
import type { DbState } from './types'

export type CartOwner = Cart['owner']

const findCart = (db: DbState, owner: CartOwner): Cart | undefined =>
  db.carts.find((c) => c.owner === owner)

const sameLine = (nftId: string, editionId: string) => (item: CartItem) =>
  item.nftId === nftId && item.editionId === editionId

function ensureCart(db: DbState, owner: CartOwner): Cart {
  const existing = findCart(db, owner)
  if (existing) return existing
  const cart: Cart = { id: `cart-${owner}`, owner, items: [], version: 0 }
  db.carts.push(cart)
  return cart
}

/** Cópia de resposta: preço e disponibilidade vêm da edição atual, não do momento da adição. */
function snapshot(db: DbState, cart: Cart): Cart {
  const copy = structuredClone(cart)
  copy.items = copy.items.map((item) => {
    const edition = db.nfts
      .find((n) => n.id === item.nftId)
      ?.editions.find((e) => e.id === item.editionId)
    return edition ? { ...item, unitPrice: edition.price, available: edition.available } : item
  })
  return copy
}

/** Carrinho do dono; criado vazio na primeira consulta. */
export const getOrCreateCart = (owner: CartOwner): Cart =>
  mutateDb((db) => snapshot(db, ensureCart(db, owner)))

export function toCartItem(nft: Nft, edition: Edition, quantity: number): CartItem {
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

/** Define a quantidade absoluta da linha (cria ou substitui) e sobe a versão. */
export function setCartLine(owner: CartOwner, item: CartItem): Cart {
  return mutateDb((db) => {
    const cart = ensureCart(db, owner)
    const index = cart.items.findIndex(sameLine(item.nftId, item.editionId))
    if (index >= 0) cart.items[index] = item
    else cart.items.push(item)
    cart.version = nextVersion(cart.version)
    return snapshot(db, cart)
  })
}

export function removeCartLine(owner: CartOwner, nftId: string, editionId: string): Cart {
  return mutateDb((db) => {
    const cart = ensureCart(db, owner)
    cart.items = cart.items.filter((i) => !sameLine(nftId, editionId)(i))
    cart.version = nextVersion(cart.version)
    return snapshot(db, cart)
  })
}

export const findCartLine = (cart: Cart, nftId: string, editionId: string): CartItem | undefined =>
  cart.items.find(sameLine(nftId, editionId))

/** `code` ausente remove o cupom; ambos sobem a versão porque mudam a cotação. */
export function setCartCoupon(owner: CartOwner, code: string | undefined): Cart {
  return mutateDb((db) => {
    const cart = ensureCart(db, owner)
    if (code === undefined) delete cart.couponCode
    else cart.couponCode = code
    cart.version = nextVersion(cart.version)
    return snapshot(db, cart)
  })
}
