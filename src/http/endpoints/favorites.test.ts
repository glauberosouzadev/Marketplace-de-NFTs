import { describe, expect, it, vi } from 'vitest'

const request = vi.fn<(c: unknown) => Promise<unknown>>().mockResolvedValue(undefined)
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { addFavorite, getFavorites, removeFavorite } from './favorites'

describe('endpoints de favoritos', () => {
  it('GET /me/favorites repassa o signal', async () => {
    const signal = new AbortController().signal
    await getFavorites(signal)
    expect(request).toHaveBeenCalledWith({ method: 'GET', url: '/me/favorites', signal })
  })

  it('PUT e DELETE de /me/favorites/:nftId com o id codificado', async () => {
    await addFavorite('n 1')
    expect(request).toHaveBeenCalledWith({ method: 'PUT', url: '/me/favorites/n%201' })
    await removeFavorite('n 1')
    expect(request).toHaveBeenCalledWith({ method: 'DELETE', url: '/me/favorites/n%201' })
  })
})
