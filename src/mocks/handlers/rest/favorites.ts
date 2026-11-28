import { http, HttpResponse } from 'msw'
import type { ListFavoritesResponse } from '@/contracts'
import { addFavorite, listFavorites, removeFavorite } from '../../db/favorites'
import { getDb } from '../../db/store'
import {
  apiUrl,
  errorResponse,
  resolveSession,
  sessionError,
  withScenario,
  type ResolvedSession,
} from '../util'
import { toSummary } from './nfts'

function requireSession(request: Request): ResolvedSession | Response {
  return resolveSession(request) ?? sessionError(request)
}

export const favoritesHandlers = [
  http.get(
    apiUrl('/me/favorites'),
    withScenario('GET /me/favorites', ({ request }) => {
      const auth = requireSession(request)
      if (auth instanceof Response) return auth
      const db = getDb()
      const items: ListFavoritesResponse['items'] = []
      for (const { nftId, createdAt } of listFavorites(db.favorites, auth.user.id)) {
        const nft = db.nfts.find((n) => n.id === nftId)
        if (nft) items.push({ nftId, createdAt, nft: toSummary(nft) })
      }
      return HttpResponse.json({ items } satisfies ListFavoritesResponse)
    }),
  ),
  http.put<{ nftId: string }>(
    apiUrl('/me/favorites/:nftId'),
    withScenario('PUT /me/favorites/:nftId', ({ request, params }) => {
      const auth = requireSession(request)
      if (auth instanceof Response) return auth
      if (!getDb().nfts.some((n) => n.id === params.nftId)) {
        return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado')
      }
      addFavorite(auth.user.id, params.nftId)
      return new HttpResponse(null, { status: 204 })
    }),
  ),
  http.delete<{ nftId: string }>(
    apiUrl('/me/favorites/:nftId'),
    withScenario('DELETE /me/favorites/:nftId', ({ request, params }) => {
      const auth = requireSession(request)
      if (auth instanceof Response) return auth
      removeFavorite(auth.user.id, params.nftId)
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
