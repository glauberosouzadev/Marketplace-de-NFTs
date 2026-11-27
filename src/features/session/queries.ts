import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { User } from '@/contracts'
import { getSession as fetchSession } from '@/http/endpoints/auth'
import { getSession as readStoredSession } from '@/lib/storage'

/** Sem token local não consulta a API; com token, revalida no boot (FR-42, SDD-06). */
export const sessionQuery = () =>
  queryOptions({
    queryKey: queryKeys.session(),
    queryFn: async ({ signal }): Promise<User | null> => {
      if (!readStoredSession()) return null
      const { user } = await fetchSession(signal)
      return user
    },
    staleTime: Infinity,
    retry: 0,
  })

export const useSession = () => useQuery(sessionQuery())
