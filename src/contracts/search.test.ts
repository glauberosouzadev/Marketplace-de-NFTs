import { describe, expect, it } from 'vitest'
import {
  authSearchSchema,
  catalogSearchSchema,
  loginHref,
  patchSearch,
  safeRedirect,
  toListQuery,
} from './search'

const base = catalogSearchSchema.parse({})

describe('catalogSearchSchema', () => {
  it('aplica defaults', () => {
    expect(base).toMatchObject({
      tab: 'all',
      sort: 'recent',
      page: 1,
      q: '',
      collection: [],
      network: [],
    })
  })
  it('valores inválidos caem no default sem lançar', () => {
    const s = catalogSearchSchema.parse({
      tab: 'x',
      sort: 1,
      page: -3,
      network: ['bsc'],
      priceMin: 'abc',
    })
    expect(s).toMatchObject({
      tab: 'all',
      sort: 'recent',
      page: 1,
      network: [],
      priceMin: undefined,
    })
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

describe('safeRedirect', () => {
  it('aceita caminho interno com query', () => {
    expect(safeRedirect('/pagamento?x=1')).toBe('/pagamento?x=1')
  })
  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '', '/\t/evil.com', undefined, 42])(
    'rejeita %j e devolve /',
    (value) => {
      expect(safeRedirect(value)).toBe('/')
    },
  )
  it.each([
    'javascript:alert(1)',
    ' //evil.com',
    ' /perfil',
    '/ /evil.com',
    '/\n/evil.com',
    '/\r/evil.com',
    '/\u0000/evil.com',
    '/perfil\n',
    'evil.com',
    'http://evil.com',
    '\\\\evil.com',
    '/\\/evil.com',
    null,
    {},
    ['/perfil'],
  ])('rejeita variante maliciosa %j', (value) => {
    expect(safeRedirect(value)).toBe('/')
  })
})

describe('authSearchSchema', () => {
  it('sanitiza redirect e ignora reason desconhecido', () => {
    expect(authSearchSchema.parse({ redirect: '//evil.com', reason: 'x' })).toEqual({
      redirect: '/',
      reason: undefined,
    })
    expect(authSearchSchema.parse({ redirect: '/perfil', reason: 'expired' })).toEqual({
      redirect: '/perfil',
      reason: 'expired',
    })
  })
})

describe('loginHref', () => {
  it('monta /login com redirect seguro', () => {
    const url = new URL(loginHref('/pedido/1?a=b'), 'http://x')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/pedido/1?a=b')
    expect(new URL(loginHref('//evil.com'), 'http://x').searchParams.get('redirect')).toBe('/')
  })
})
