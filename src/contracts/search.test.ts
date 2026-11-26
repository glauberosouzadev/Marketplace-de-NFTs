import { describe, expect, it } from 'vitest'
import { catalogSearchSchema, patchSearch, toListQuery } from './search'

const base = catalogSearchSchema.parse({})

describe('catalogSearchSchema', () => {
  it('aplica defaults', () => {
    expect(base).toMatchObject({ tab: 'all', sort: 'recent', page: 1, q: '', collection: [], network: [] })
  })
  it('valores inválidos caem no default sem lançar', () => {
    const s = catalogSearchSchema.parse({ tab: 'x', sort: 1, page: -3, network: ['bsc'], priceMin: 'abc' })
    expect(s).toMatchObject({ tab: 'all', sort: 'recent', page: 1, network: [], priceMin: undefined })
  })
  it('aceita valor único como lista e page numérica em string', () => {
    const s = catalogSearchSchema.parse({ collection: 'a', page: '3' })
    expect(s.collection).toEqual(['a'])
    expect(s.page).toBe(3)
  })
})

describe('patchSearch (RN-16)', () => {
  const at3 = { ...base, page: 3 }
  it.each([
    { q: 'x' },
    { collection: ['a'] },
    { network: ['solana' as const] },
    { priceMin: '1' },
    { priceMax: '2' },
    { tab: 'new' as const },
    { sort: 'price_asc' as const },
  ])('zera page ao mudar %o', (patch) => {
    expect(patchSearch(at3, patch).page).toBe(1)
  })
  it('preserva page quando só page muda', () => {
    expect(patchSearch(at3, { page: 4 }).page).toBe(4)
  })
})

describe('toListQuery', () => {
  it('omite vazios e fixa pageSize', () => {
    expect(toListQuery(base)).toEqual({ tab: 'all', sort: 'recent', page: 1, pageSize: 12 })
  })
})
