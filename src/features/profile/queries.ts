import { queryOptions, useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import { getProfile } from '@/http/endpoints/profile'

export const profileQuery = (uid: string) =>
  queryOptions({
    queryKey: queryKeys.profile(uid),
    queryFn: ({ signal }) => getProfile(signal),
    staleTime: 60_000,
    retry: (count, error) => shouldRetry(count, error, 1),
  })

export const useProfile = (uid: string) => useQuery(profileQuery(uid))
