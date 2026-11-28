import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { cartQuery } from '@/features/cart/queries'
import type { Notice } from '@/realtime/notices'

export const EMPTY_CART_NOTICE: Notice = {
  id: 'checkout-empty-cart',
  politeness: 'polite',
  text: 'Seu carrinho está vazio. Adicione um NFT para ir ao pagamento.',
}

/** FR-26: carrinho vazio volta ao carrinho com aviso; o carrinho é sempre lido do servidor. */
export async function requireCartItems(
  queryClient: Pick<QueryClient, 'fetchQuery'>,
  uid: string,
  publishNotice: (notice: Notice) => void,
): Promise<void> {
  const cart = await queryClient.fetchQuery(cartQuery(['user', uid]))
  if (cart.items.length > 0) return
  publishNotice(EMPTY_CART_NOTICE)
  throw redirect({ to: '/carrinho', replace: true })
}
