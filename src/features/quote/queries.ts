import { queryOptions, useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/app/query-client'
import { queryKeys, type Scope } from '@/app/query-keys'
import type { CartResponse, Network } from '@/contracts'
import { createQuote } from '@/http/endpoints/quotes'

export const quoteQuery = (scope: Scope, cart: CartResponse, network: Network) =>
  queryOptions({
    queryKey: queryKeys.quote(scope, cart.version, cart.couponCode ?? null, network),
    queryFn: ({ signal }) => createQuote({ network }, signal),
    staleTime: 0,
    retry: (count, error) => shouldRetry(count, error, 1),
  })

export const useQuote = (scope: Scope, cart: CartResponse, network: Network = 'ethereum') =>
  useQuery(quoteQuery(scope, cart, network))
