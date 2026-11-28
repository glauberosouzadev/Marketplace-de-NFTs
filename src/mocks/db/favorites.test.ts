import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addFavorite, listFavorites, removeFavorite } from './favorites'
import { getDb, resetDb } from './store'

beforeEach(() => {
  resetDb()
})

describe('favoritos no banco simulado', () => {
  it('addFavorite é idempotente e preserva o createdAt original', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'))
    addFavorite('user-001', 'nft-001')
    vi.setSystemTime(new Date('2030-01-02T00:00:00.000Z'))
    addFavorite('user-001', 'nft-001')
    vi.useRealTimers()
    expect(getDb().favorites).toEqual([
      { userId: 'user-001', nftId: 'nft-001', createdAt: '2030-01-01T00:00:00.000Z' },
    ])
  })

  it('removeFavorite remove só o par usuário/NFT e tolera repetição', () => {
    addFavorite('user-001', 'nft-001')
    addFavorite('user-002', 'nft-001')
    removeFavorite('user-001', 'nft-001')
    removeFavorite('user-001', 'nft-001')
    expect(getDb().favorites.map((f) => f.userId)).toEqual(['user-002'])
  })

  it('listFavorites filtra por usuário e ordena por createdAt desc', () => {
    const favorites = [
      { userId: 'user-001', nftId: 'a', createdAt: '2030-01-01T00:00:00.000Z' },
      { userId: 'user-002', nftId: 'x', createdAt: '2030-01-05T00:00:00.000Z' },
      { userId: 'user-001', nftId: 'b', createdAt: '2030-01-03T00:00:00.000Z' },
    ]
    expect(listFavorites(favorites, 'user-001').map((f) => f.nftId)).toEqual(['b', 'a'])
  })
})
