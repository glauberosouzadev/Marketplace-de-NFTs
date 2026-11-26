import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ErrorEnvelope,
  FacetsResponse,
  FeaturedResponse,
  ListNftsResponse,
  Nft,
} from '@/contracts'
import { compare, parse } from '@/contracts/decimal'
import { resetDb } from '../../db/store'
import { activateScenario } from '../../scenarios/active'
import { apiUrl } from '../util'
import { restHandlers } from '.'

// Em Node não há `location`: a base absoluta precisa existir antes de `util` ser carregado.
vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/v1'))

const server = setupServer(...restHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  resetDb()
  activateScenario('default')
})

const get = (path: string) => fetch(apiUrl(path))
const list = async (qs = ''): Promise<ListNftsResponse> =>
  (await get(`/nfts?${qs}`)).json() as Promise<ListNftsResponse>

describe('GET /nfts', () => {
  it('seed tem >= 3 páginas e pageSize 12', async () => {
    const body = await list()
    expect(body.pageSize).toBe(12)
    expect(body.totalPages).toBeGreaterThanOrEqual(3)
    expect(body.items).toHaveLength(12)
  })

  it('pageSize inválido responde 422 VALIDATION', async () => {
    for (const value of ['0', 'abc']) {
      const res = await get(`/nfts?pageSize=${value}`)
      const body = (await res.json()) as ErrorEnvelope
      expect(res.status).toBe(422)
      expect(JSON.stringify(body)).toContain('VALIDATION')
    }
  })

  it('combinação coleção Utilidade + Solana é vazia', async () => {
    const body = await list('collection=utilidade&network=solana')
    expect(body).toMatchObject({ items: [], total: 0, totalPages: 0 })
  })

  it('combinar filtros devolve a interseção', async () => {
    const byCollection = await list('collection=arte-digital')
    const both = await list('collection=arte-digital&network=polygon')
    expect(both.total).toBeLessThanOrEqual(byCollection.total)
    expect(
      both.items.every((n) => n.collection.id === 'arte-digital' && n.network === 'polygon'),
    ).toBe(true)
  })

  it('q busca por nome ou coleção sem acento', async () => {
    const body = await list('q=musica')
    expect(body.total).toBeGreaterThan(0)
    expect(body.items.every((n) => /m[uú]sica/i.test(`${n.name} ${n.collection.name}`))).toBe(true)
  })

  it('tab=trending filtra por tag', async () => {
    const body = await list('tab=trending')
    expect(body.items.every((n) => n.tags.includes('trending'))).toBe(true)
  })

  it('ordena por preço com desempate estável por id', async () => {
    const asc = (await list('sort=price_asc')).items
    for (let i = 1; i < asc.length; i++) {
      const prev = asc[i - 1]!
      const cur = asc[i]!
      const c = compare(parse(prev.priceFrom), parse(cur.priceFrom))
      expect(c).toBeLessThanOrEqual(0)
      if (c === 0) expect(prev.id < cur.id).toBe(true)
    }
    const desc = (await list('sort=price_desc')).items
    expect(
      compare(parse(desc[0]!.priceFrom), parse(desc[desc.length - 1]!.priceFrom)),
    ).toBeGreaterThanOrEqual(0)
  })

  it('recent ordena por listedAt decrescente', async () => {
    const { items } = await list('sort=recent')
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1]!.listedAt >= items[i]!.listedAt).toBe(true)
    }
  })

  it('filtra por faixa de preço', async () => {
    const { items } = await list('priceMin=0.5&priceMax=1')
    expect(items.every((n) => compare(parse(n.priceFrom), parse('0.5')) >= 0)).toBe(true)
    expect(items.every((n) => compare(parse(n.priceFrom), parse('1')) <= 0)).toBe(true)
  })

  it('página fora do intervalo devolve items vazio com totais reais', async () => {
    const body = await list('page=99')
    expect(body.items).toEqual([])
    expect(body.total).toBeGreaterThan(24)
    expect(body.page).toBe(99)
  })

  it.each([
    'page=0',
    'page=abc',
    'sort=foo',
    'priceMin=1,5',
    'priceMax=-1',
    'network=bsc',
    'tab=x',
  ])('422 VALIDATION para %s', async (qs) => {
    const res = await get(`/nfts?${qs}`)
    expect(res.status).toBe(422)
    expect(((await res.json()) as ErrorEnvelope).code).toBe('VALIDATION')
  })

  it('S-03: falha transitória nas primeiras chamadas, sem alterar o handler', async () => {
    activateScenario('S-03')
    const res = await get('/nfts')
    expect(res.status).toBe(503)
    expect(((await res.json()) as ErrorEnvelope).code).toBe('TRANSIENT')
  })
})

describe('GET /nfts/facets', () => {
  it('contagens por dimensão ignoram o próprio filtro', async () => {
    const res = await get('/nfts/facets?collection=utilidade&network=solana')
    const facets = (await res.json()) as FacetsResponse
    const utilidade = facets.collections.find((c) => c.id === 'utilidade')!
    expect(utilidade.count).toBe(0)
    expect(facets.collections.some((c) => c.id !== 'utilidade' && c.count > 0)).toBe(true)
    expect(facets.networks.find((n) => n.id === 'solana')!.count).toBe(0)
    expect(facets.networks.some((n) => n.count > 0)).toBe(true)
  })

  it('sem filtros: soma das coleções = total e price min <= max', async () => {
    const facets = (await (await get('/nfts/facets')).json()) as FacetsResponse
    const total = (await list()).total
    expect(facets.collections.reduce((s, c) => s + c.count, 0)).toBe(total)
    expect(compare(parse(facets.price.min), parse(facets.price.max))).toBeLessThanOrEqual(0)
  })

  it('422 para preço inválido', async () => {
    expect((await get('/nfts/facets?priceMin=x')).status).toBe(422)
  })
})

describe('GET /nfts/featured', () => {
  it('devolve 3 itens trending', async () => {
    const body = (await (await get('/nfts/featured')).json()) as FeaturedResponse
    expect(body.items).toHaveLength(3)
    expect(body.items.every((n) => n.tags.includes('trending'))).toBe(true)
  })
})

describe('GET /nfts/:id', () => {
  it('devolve Nft com editions e version', async () => {
    const first = (await list()).items[0]!
    const nft = (await (await get(`/nfts/${first.id}`)).json()) as Nft
    expect(nft.id).toBe(first.id)
    expect(nft.editions.length).toBeGreaterThan(0)
    expect(typeof nft.version).toBe('number')
  })

  it('404 NOT_FOUND para id inexistente (e facets/featured não caem aqui)', async () => {
    const res = await get('/nfts/nao-existe')
    expect(res.status).toBe(404)
    expect(((await res.json()) as ErrorEnvelope).code).toBe('NOT_FOUND')
  })
})

describe('GET /nfts validação (critério 7)', () => {
  it.each(['page=0', 'page=-1', 'sort=barato', 'priceMin=1,5', 'network=bitcoin', 'tab=hot'])(
    '422 VALIDATION para %s',
    async (qs) => {
      const res = await get(`/nfts?${qs}`)
      expect(res.status).toBe(422)
      expect(((await res.json()) as { code: string }).code).toBe('VALIDATION')
    },
  )
})
