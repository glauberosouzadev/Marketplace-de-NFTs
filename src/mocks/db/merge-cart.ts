import type { Cart, CartAdjustment, CartItem } from '@/contracts'
import { toCartItem } from './cart'
import { nextVersion } from './store'
import type { DbState } from './types'

function userCart(db: DbState, userId: string): Cart {
  const owner: Cart['owner'] = `user:${userId}`
  const existing = db.carts.find((c) => c.owner === owner)
  if (existing) return existing
  const cart: Cart = { id: `cart-${owner}`, owner, items: [], version: 0 }
  db.carts.push(cart)
  return cart
}

interface LineResult {
  adjustment: CartAdjustment | null
  changed: boolean
}

function mergeLine(db: DbState, cart: Cart, line: CartItem): LineResult {
  const nft = db.nfts.find((n) => n.id === line.nftId)
  const edition = nft?.editions.find((e) => e.id === line.editionId)
  const ref = { nftId: line.nftId, editionId: line.editionId }
  const index = cart.items.findIndex(
    (i) => i.nftId === line.nftId && i.editionId === line.editionId,
  )
  const requested = (index >= 0 ? cart.items[index]!.quantity : 0) + line.quantity

  // Q-19: a linha some do carrinho do usuário, inclusive a que ele já tinha.
  if (!nft || !edition || edition.available <= 0) {
    if (index >= 0) cart.items.splice(index, 1)
    const reason = !nft || !edition ? 'REMOVED' : 'SOLD_OUT'
    return {
      adjustment: { ...ref, reason, previousQuantity: requested, currentQuantity: 0 },
      changed: index >= 0,
    }
  }

  const quantity = Math.min(requested, edition.available)
  const item = toCartItem(nft, edition, quantity)
  if (index >= 0) cart.items[index] = item
  else cart.items.push(item)
  return {
    adjustment:
      quantity < requested
        ? {
            ...ref,
            reason: 'QUANTITY_REDUCED',
            previousQuantity: requested,
            currentQuantity: quantity,
          }
        : null,
    changed: true,
  }
}

/**
 * Funde o carrinho do visitante no do usuário sobre o rascunho `db` (Q-19) e remove o do
 * visitante. Linhas esgotadas ou inexistentes não entram; cada ajuste é reportado.
 */
export function mergeGuestCart(db: DbState, guestCartId: string, userId: string): CartAdjustment[] {
  const guestOwner: Cart['owner'] = `guest:${guestCartId}`
  const guest = db.carts.find((c) => c.owner === guestOwner)
  if (!guest) return []
  db.carts = db.carts.filter((c) => c !== guest)
  if (guest.items.length === 0) return []

  const cart = userCart(db, userId)
  const results = guest.items.map((line) => mergeLine(db, cart, line))
  if (results.some((r) => r.changed)) cart.version = nextVersion(cart.version)
  return results.flatMap((r) => (r.adjustment ? [r.adjustment] : []))
}
