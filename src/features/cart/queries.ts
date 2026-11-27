import { queryOptions, useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/app/query-client'
import { queryKeys, type Scope } from '@/app/query-keys'
import { getCart } from '@/http/endpoints/cart'
import { currentCartScope } from './mutations'

export const cartQuery = (scope: Scope) =>
  queryOptions({
    queryKey: queryKeys.cart(scope),
    queryFn: ({ signal }) => getCart(signal),
    staleTime: 0,
    retry: (count, error) => shouldRetry(count, error, 1),
  })

export const useCart = (scope: Scope = currentCartScope()) => useQuery(cartQuery(scope))
