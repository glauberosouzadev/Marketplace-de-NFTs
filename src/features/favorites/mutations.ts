import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { ListFavoritesResponse, NftSummary } from '@/contracts'
import { errorMessage } from '@/http/error-messages'
import { addFavorite, removeFavorite } from '@/http/endpoints/favorites'
import { isApiError } from '@/http/normalize-error'
import { noticeBus } from '@/realtime/notices'

export interface ToggleFavoriteVars {
  nft: NftSummary
  /** Estado desejado após o clique. */
  favorite: boolean
}

type FavoriteItem = ListFavoritesResponse['items'][number]

interface ToggleFavoriteContext {
  previous: { item: FavoriteItem; index: number } | null
}

const favoritesMutationKey = (uid: string) => ['user', uid, 'favorites', 'toggle'] as const

/** O detalhe passa um `Nft` (com `editions`); o cache da lista guarda só o `NftSummary`. */
export function toNftSummary(nft: NftSummary): NftSummary {
  const summary: NftSummary & { editions?: unknown } = { ...nft }
  delete summary.editions
  return summary
}

function withoutItem(data: ListFavoritesResponse, nftId: string): ListFavoritesResponse {
  return { items: data.items.filter((i) => i.nftId !== nftId) }
}

function withItem(data: ListFavoritesResponse, item: FavoriteItem, index: number) {
  const items = withoutItem(data, item.nftId).items
  return { items: [...items.slice(0, index), item, ...items.slice(index)] }
}

function failureText(nft: NftSummary, favorite: boolean, error: unknown): string {
  const action = favorite ? `adicionar "${nft.name}" aos` : `remover "${nft.name}" dos`
  const reason = errorMessage(isApiError(error) ? error.code : 'TRANSIENT')
  return `Não foi possível ${action} favoritos. ${reason}`
}

/**
 * Otimista (SDD-06), sem retry. `scope` por usuário serializa as requisições: o servidor
 * recebe os cliques na ordem e termina no estado do último. Rollback e invalidação esperam
 * o último toggle pendente para não desfazer nem sobrescrever um patch mais novo.
 */
export const toggleFavoriteMutation = (client: QueryClient, uid: string) => {
  const queryKey = queryKeys.favorites(uid)
  const mutationKey = favoritesMutationKey(uid)
  const pendingFor = (nftId?: string) =>
    client.isMutating({
      mutationKey,
      predicate: (m) =>
        nftId === undefined ||
        (m.state.variables as ToggleFavoriteVars | undefined)?.nft.id === nftId,
    })

  return {
    mutationKey,
    scope: { id: `favorites:${uid}` },
    retry: 0,
    mutationFn: ({ nft, favorite }: ToggleFavoriteVars): Promise<void> =>
      favorite ? addFavorite(nft.id) : removeFavorite(nft.id),
    onMutate: async ({ nft, favorite }: ToggleFavoriteVars): Promise<ToggleFavoriteContext> => {
      await client.cancelQueries({ queryKey })
      const data = client.getQueryData<ListFavoritesResponse>(queryKey)
      const index = data?.items.findIndex((i) => i.nftId === nft.id) ?? -1
      const item = index >= 0 ? data?.items[index] : undefined
      const optimistic: FavoriteItem = {
        nftId: nft.id,
        createdAt: new Date().toISOString(),
        nft: toNftSummary(nft),
      }
      client.setQueryData<ListFavoritesResponse>(queryKey, (current) => {
        if (!current) return current
        return favorite ? withItem(current, item ?? optimistic, 0) : withoutItem(current, nft.id)
      })
      return { previous: item ? { item, index } : null }
    },
    onError: (
      error: unknown,
      { nft, favorite }: ToggleFavoriteVars,
      context: ToggleFavoriteContext | undefined,
    ) => {
      if (context && pendingFor(nft.id) === 1) {
        client.setQueryData<ListFavoritesResponse>(queryKey, (current) => {
          if (!current) return current
          const { previous } = context
          return previous
            ? withItem(current, previous.item, previous.index)
            : withoutItem(current, nft.id)
        })
      }
      noticeBus.publish({
        id: `favorite:${nft.id}`,
        politeness: 'polite',
        text: failureText(nft, favorite, error),
      })
    },
    onSettled: () => {
      if (pendingFor() === 1) return client.invalidateQueries({ queryKey })
    },
  }
}

export const useToggleFavorite = (uid: string) =>
  useMutation(toggleFavoriteMutation(useQueryClient(), uid))
