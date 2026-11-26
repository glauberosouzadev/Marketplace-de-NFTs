import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'

describe('queryKeys', () => {
  it('facetas ficam fora do prefixo do catálogo', () => {
    const [scope, kind] = queryKeys.facets({})
    expect([scope, kind]).toEqual(['public', 'facets'])
    expect(queryKeys.nfts({})[1]).toBe('nfts')
  })
})
