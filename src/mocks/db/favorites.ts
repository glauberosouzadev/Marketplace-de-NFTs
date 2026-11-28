import type { Favorite } from '@/contracts'
import { mutateDb } from './store'

/** Idempotente: repetir não duplica nem altera o createdAt original. */
export function addFavorite(userId: string, nftId: string): void {
  mutateDb((db) => {
    if (db.favorites.some((f) => f.userId === userId && f.nftId === nftId)) return
    db.favorites.push({ userId, nftId, createdAt: new Date().toISOString() })
  })
}

export function removeFavorite(userId: string, nftId: string): void {
  mutateDb((db) => {
    db.favorites = db.favorites.filter((f) => !(f.userId === userId && f.nftId === nftId))
  })
}

/** Do mais recente para o mais antigo. */
export function listFavorites(favorites: readonly Favorite[], userId: string): Favorite[] {
  return favorites
    .filter((f) => f.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
