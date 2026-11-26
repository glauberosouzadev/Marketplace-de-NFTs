import { describe, expect, it } from 'vitest'
import { nftQuery } from '@/features/nft-detail/queries'
import { shouldRetry } from '@/app/query-client'
import { facetsQuery, featuredQuery, nftsQuery } from './queries'

describe('opções das queries (SDD-06)', () => {
  it('catálogo: staleTime 30 s e placeholderData', () => {
    const o = nftsQuery({ page: 1, pageSize: 12 } as never)
    expect(o.staleTime).toBe(30_000)
    expect(o.placeholderData).toBeTypeOf('function')
  })

  it('facetas, destaques: 60 s; detalhe: 30 s', () => {
    expect(facetsQuery({} as never).staleTime).toBe(60_000)
    expect(featuredQuery().staleTime).toBe(60_000)
    expect(nftQuery('x').staleTime).toBe(30_000)
  })

  it('retry: 404 nunca; 5xx até 2', () => {
    const e404 = { kind: 'http', status: 404 }
    const e503 = { kind: 'http', status: 503 }
    expect(shouldRetry(0, e404)).toBe(false)
    expect(shouldRetry(1, e503)).toBe(true)
    expect(shouldRetry(2, e503)).toBe(false)
  })
})
