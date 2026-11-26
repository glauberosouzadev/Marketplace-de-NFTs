import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type Scope } from '@/app/query-keys'
import type { AddCartItemRequest, ApiError, CartResponse } from '@/contracts'
import { addCartItem } from '@/http/endpoints/cart'
import { isApiError } from '@/http/normalize-error'
import { getGuestCartId, getSession } from '@/lib/storage'

/** Escopo do carrinho: usuário com sessão ou visitante pelo `kurio:guestCartId` (SDD-06). */
export function currentCartScope(): Scope {
  const session = getSession()
  return session ? ['user', session.uid] : ['guest', getGuestCartId()]
}

interface CartMutationContext {
  scope: Scope
}

export const isAvailabilityConflict = (error: unknown): error is ApiError =>
  isApiError(error) && error.code === 'AVAILABILITY_CONFLICT'

/**
 * Sem retry; sucesso invalida o carrinho do escopo capturado em `onMutate`
 * (login/logout durante o request não desvia a invalidação); 409 só revalida o NFT.
 */
export const addToCartMutation = (client: QueryClient, scope: () => Scope = currentCartScope) => ({
  mutationFn: (body: AddCartItemRequest): Promise<CartResponse> => addCartItem(body),
  retry: 0,
  onMutate: (): CartMutationContext => ({ scope: scope() }),
  onSuccess: (_data: CartResponse, _body: AddCartItemRequest, context: CartMutationContext) =>
    client.invalidateQueries({ queryKey: queryKeys.cart(context.scope) }),
  onError: (error: unknown, body: AddCartItemRequest) => {
    if (isAvailabilityConflict(error)) {
      return client.invalidateQueries({ queryKey: queryKeys.nft(body.nftId) })
    }
  },
})

export function useAddToCart() {
  const client = useQueryClient()
  return useMutation(addToCartMutation(client))
}
