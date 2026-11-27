import type { CartResponse } from '@/contracts'
import { useSession } from '@/features/session/queries'
import { useCart } from './queries'

export const countCartItems = (cart: Pick<CartResponse, 'items'> | undefined): number =>
  cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0

export const cartCountLabel = (count: number): string =>
  count === 0 ? 'Carrinho vazio' : `${count} ${count === 1 ? 'item' : 'itens'} no carrinho`

/** Lê a sessão só para re-render na troca de escopo (login/logout); `useCart` resolve o escopo no render. */
export function useCartCount(): { count: number; loaded: boolean } {
  useSession()
  const cart = useCart()
  return { count: countCartItems(cart.data), loaded: cart.isSuccess }
}
