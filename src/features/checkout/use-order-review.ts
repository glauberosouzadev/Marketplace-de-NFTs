import { useState } from 'react'
import type { CartResponse, Quote } from '@/contracts'
import { useQuote } from '@/features/quote/queries'
import type { CheckoutDraft } from './checkout-draft'
import { blockReason, confirmBlock, isOutdated, isUserDriven, quoteChanges } from './revalidation'
import type { CheckoutController } from './use-checkout'

/**
 * Revisão do pedido (FR-30, FR-31, J-04). A cotação exibida é a revisada; `nft.updated` invalida
 * a cotação no reconciliador e a nova, se diferente, bloqueia "Confirmar" até o usuário aceitar.
 */
export function useOrderReview(
  uid: string,
  cart: CartResponse,
  draft: CheckoutDraft,
  controller: CheckoutController,
) {
  const quote = useQuote(['user', uid], cart, draft.network ?? undefined)
  const current = quote.data
  const [reviewed, setReviewed] = useState<Quote | null>(null)
  // Ajuste de estado durante o render (padrão do React para derivar de props).
  if (current && (!reviewed || isUserDriven(reviewed, current))) setReviewed(current)

  const outdated = isOutdated(draft.status, reviewed, current)
  const block = confirmBlock(draft.status, outdated, current)

  return {
    quote,
    outdated,
    block,
    reason: blockReason(block, current, cart.items),
    changes: outdated && reviewed && current ? quoteChanges(reviewed, current, cart.items) : [],
    accept(): void {
      if (!current) return
      setReviewed(current)
      controller.review(current)
    },
    /** A cotação exibida vira a revisada e é revalidada antes de qualquer pedido (FR-31). */
    confirm(): void {
      if (block || !reviewed) return
      controller.review(reviewed)
      void controller.confirm()
    },
  }
}

export type OrderReview = ReturnType<typeof useOrderReview>
