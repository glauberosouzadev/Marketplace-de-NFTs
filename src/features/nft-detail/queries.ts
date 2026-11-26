import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { getNft } from '@/http/endpoints/nfts'

// Retry herdado do QueryClient: 4xx (404) nunca refaz; rede/5xx até 2 vezes.
export const nftQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nft(id),
    queryFn: ({ signal }) => getNft(id, signal),
    staleTime: 30_000,
  })

export const useNft = (id: string) => useQuery(nftQuery(id))
