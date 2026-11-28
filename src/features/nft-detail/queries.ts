import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { getNft } from '@/http/endpoints/nfts'
import { useRestObserver } from '@/realtime/realtime-provider'
import type { RestObserver } from '@/realtime/realtime-sync'

// Retry herdado do QueryClient: 4xx (404) nunca refaz; rede/5xx até 2 vezes.
export const nftQuery = (id: string, observer: Pick<RestObserver, 'observeNft'>) =>
  queryOptions({
    queryKey: queryKeys.nft(id),
    queryFn: async ({ signal }) => {
      const nft = await getNft(id, signal)
      observer.observeNft(nft)
      return nft
    },
    staleTime: 30_000,
  })

export const useNft = (id: string) => useQuery(nftQuery(id, useRestObserver()))
