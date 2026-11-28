import { queryOptions, useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { ListFavoritesResponse } from '@/contracts'
import { getFavorites } from '@/http/endpoints/favorites'
import { useSession } from '@/features/session/queries'

export const favoritesQuery = (uid: string) =>
  queryOptions({
    queryKey: queryKeys.favorites(uid),
    queryFn: ({ signal }) => getFavorites(signal),
    staleTime: 60_000,
    retry: (count, error) => shouldRetry(count, error, 2),
  })

/** Sem sessão não consulta: a chave sempre carrega o `uid` (isolamento por usuário). */
export const useFavorites = (uid: string | null | undefined) =>
  useQuery({ ...favoritesQuery(uid ?? ''), enabled: Boolean(uid) })

// Referência estável: o `select` só recalcula quando a lista muda.
export const favoriteIdSet = (data: ListFavoritesResponse): ReadonlySet<string> =>
  new Set(data.items.map((item) => item.nftId))

export function useIsFavorite(nftId: string): boolean {
  const uid = useSession().data?.id
  const { data } = useQuery({
    ...favoritesQuery(uid ?? ''),
    enabled: Boolean(uid),
    select: favoriteIdSet,
  })
  return data?.has(nftId) ?? false
}
