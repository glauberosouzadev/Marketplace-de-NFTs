import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn<(c: { url: string; signal: AbortSignal }) => Promise<unknown>>()
vi.mock('@/http/client', () => ({
  request: (c: { url: string; signal: AbortSignal }) => request(c),
}))

import { getFacets, getFeatured, getNft, getNfts } from './nfts'

beforeEach(() => request.mockReset().mockResolvedValue({}))

describe('endpoints de nfts', () => {
  it('repete chaves, omite vazios e envia pageSize=12', async () => {
    const signal = new AbortController().signal
    await getNfts(
      { q: '', collection: ['a', 'b'], network: ['ethereum', 'solana'], priceMin: '0.5', page: 2 },
      signal,
    )
    const url = request.mock.calls[0]?.[0].url
    expect(url).toBe(
      '/nfts?collection=a&collection=b&network=ethereum&network=solana&priceMin=0.5&page=2&pageSize=12',
    )
  })
  it('repassa o signal em todos os endpoints', async () => {
    const signal = new AbortController().signal
    await getNfts({}, signal)
    await getFacets({}, signal)
    await getFeatured(signal)
    await getNft('n 1', signal)
    for (const [cfg] of request.mock.calls) expect(cfg.signal).toBe(signal)
    expect(request.mock.calls[3]?.[0].url).toBe('/nfts/n%201')
  })
})
