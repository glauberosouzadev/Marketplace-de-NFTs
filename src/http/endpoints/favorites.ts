import { request } from '@/http/client'
import type { ListFavoritesResponse } from '@/contracts'

export function getFavorites(signal: AbortSignal): Promise<ListFavoritesResponse> {
  return request<ListFavoritesResponse>({ method: 'GET', url: '/me/favorites', signal })
}

export function addFavorite(nftId: string): Promise<void> {
  return request<void>({ method: 'PUT', url: `/me/favorites/${encodeURIComponent(nftId)}` })
}

export function removeFavorite(nftId: string): Promise<void> {
  return request<void>({ method: 'DELETE', url: `/me/favorites/${encodeURIComponent(nftId)}` })
}
