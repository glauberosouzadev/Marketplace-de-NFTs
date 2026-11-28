import { queryOptions, useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import { getWallets } from '@/http/endpoints/wallets'

export const walletsQuery = (uid: string) =>
  queryOptions({
    queryKey: queryKeys.wallets(uid),
    queryFn: ({ signal }) => getWallets(signal),
    staleTime: 60_000,
    retry: (count, error) => shouldRetry(count, error, 1),
  })

export const useWallets = (uid: string) => useQuery(walletsQuery(uid))
