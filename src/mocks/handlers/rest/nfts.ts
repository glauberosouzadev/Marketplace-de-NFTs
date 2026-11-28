import { http, HttpResponse } from 'msw'
import { CATALOG_PAGE_SIZE } from '@/contracts'
import type {
  FacetsResponse,
  FeaturedResponse,
  FieldErrors,
  ListNftsResponse,
  Network,
  Nft,
  NftFilters,
  NftSort,
  NftSummary,
  NftTab,
} from '@/contracts'
import { compare, parse, toString as decimalString } from '@/contracts/decimal'
import { getDb } from '../../db/store'
import { apiUrl, errorResponse, withScenario } from '../util'

const FEATURED_COUNT = 3
const NETWORKS: readonly Network[] = ['ethereum', 'polygon', 'solana']
const TABS: readonly NftTab[] = ['all', 'new', 'trending']
const SORTS: readonly NftSort[] = ['recent', 'price_asc', 'price_desc']

interface ParsedQuery {
  filters: NftFilters
  sort: NftSort
  page: number
  pageSize: number
}

type ParseResult = { ok: true; value: ParsedQuery } | { ok: false; fieldErrors: FieldErrors }

const isDecimal = (value: string): boolean => {
  try {
    parse(value)
    return true
  } catch {
    return false
  }
}

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function parseQuery(params: URLSearchParams): ParseResult {
  const fieldErrors: FieldErrors = {}
  const filters: NftFilters = {}

  const q = params.get('q')?.trim()
  if (q) filters.q = q

  const collection = params.getAll('collection').filter(Boolean)
  if (collection.length) filters.collection = collection

  const network = params.getAll('network').filter(Boolean)
  if (network.some((n) => !NETWORKS.includes(n as Network))) fieldErrors.network = 'Rede inválida'
  else if (network.length) filters.network = network as Network[]

  for (const key of ['priceMin', 'priceMax'] as const) {
    const value = params.get(key)
    if (value === null || value === '') continue
    if (isDecimal(value)) filters[key] = value
    else fieldErrors[key] = 'Preço inválido'
  }

  const tab = params.get('tab') ?? 'all'
  if (TABS.includes(tab as NftTab)) filters.tab = tab as NftTab
  else fieldErrors.tab = 'Aba inválida'

  const sort = params.get('sort') ?? 'recent'
  if (!SORTS.includes(sort as NftSort)) fieldErrors.sort = 'Ordenação inválida'

  const rawPage = params.get('page') ?? '1'
  const page = Number(rawPage)
  if (!/^\d+$/.test(rawPage) || page < 1) fieldErrors.page = 'Página deve ser um inteiro ≥ 1'

  const rawPageSize = params.get('pageSize') ?? String(CATALOG_PAGE_SIZE)
  const pageSize = Number(rawPageSize)
  if (!/^\d+$/.test(rawPageSize) || pageSize < 1) {
    fieldErrors.pageSize = 'Tamanho da página deve ser um inteiro ≥ 1'
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors }
  return { ok: true, value: { filters, sort: sort as NftSort, page, pageSize } }
}

const invalid = (fieldErrors: FieldErrors): Response =>
  errorResponse(422, 'VALIDATION', 'Parâmetro inválido', fieldErrors)

type Dimension = 'collection' | 'network' | 'price'

/** Aplica os filtros, ignorando as dimensões em `skip` (usado pelas facetas). */
function applyFilters(nfts: Nft[], filters: NftFilters, skip: Dimension[] = []): Nft[] {
  const { q, collection, network, priceMin, priceMax, tab } = filters
  const term = q ? normalize(q) : null
  const min = priceMin && !skip.includes('price') ? parse(priceMin) : null
  const max = priceMax && !skip.includes('price') ? parse(priceMax) : null
  return nfts.filter((nft) => {
    if (term && !normalize(`${nft.name} ${nft.collection.name}`).includes(term)) return false
    if (!skip.includes('collection') && collection && !collection.includes(nft.collection.id)) {
      return false
    }
    if (!skip.includes('network') && network && !network.includes(nft.network)) return false
    if (tab && tab !== 'all' && !nft.tags.includes(tab)) return false
    const price = parse(nft.priceFrom)
    if (min !== null && compare(price, min) < 0) return false
    if (max !== null && compare(price, max) > 0) return false
    return true
  })
}

const byId = (a: Nft, b: Nft): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
const byRecent = (a: Nft, b: Nft): number =>
  a.listedAt < b.listedAt ? 1 : a.listedAt > b.listedAt ? -1 : 0
const byPrice = (a: Nft, b: Nft): number => compare(parse(a.priceFrom), parse(b.priceFrom))

function sortNfts(nfts: Nft[], sort: NftSort): Nft[] {
  const primary = {
    recent: byRecent,
    price_asc: byPrice,
    price_desc: (a: Nft, b: Nft) => byPrice(b, a),
  }[sort]
  return [...nfts].sort((a, b) => primary(a, b) || byId(a, b))
}

export function toSummary(nft: Nft): NftSummary {
  const summary: Partial<Nft> = { ...nft }
  delete summary.editions
  return summary as NftSummary
}

function buildFacets(nfts: Nft[], filters: NftFilters): FacetsResponse {
  const { collections } = getDb()
  const byCollection = applyFilters(nfts, filters, ['collection'])
  const byNetwork = applyFilters(nfts, filters, ['network'])
  const byPrice = applyFilters(nfts, filters, ['price'])
  const prices = byPrice.map((n) => parse(n.priceFrom)).sort((a, b) => compare(a, b))
  const toStr = (value: bigint | undefined): string =>
    value === undefined ? '0' : decimalString(value)
  return {
    collections: collections.map(({ id, name }) => ({
      id,
      name,
      count: byCollection.filter((n) => n.collection.id === id).length,
    })),
    networks: NETWORKS.map((id) => ({
      id,
      count: byNetwork.filter((n) => n.network === id).length,
    })),
    price: { min: toStr(prices[0]), max: toStr(prices[prices.length - 1]) },
  }
}

export const nftsHandlers = [
  http.get(
    apiUrl('/nfts'),
    withScenario('GET /nfts', ({ request }) => {
      const parsed = parseQuery(new URL(request.url).searchParams)
      if (!parsed.ok) return invalid(parsed.fieldErrors)
      const { filters, sort, page, pageSize } = parsed.value
      const matches = sortNfts(applyFilters(getDb().nfts, filters), sort)
      const body: ListNftsResponse = {
        items: matches.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
        page,
        pageSize: pageSize,
        total: matches.length,
        totalPages: Math.ceil(matches.length / pageSize),
      }
      return HttpResponse.json(body)
    }),
  ),
  http.get(
    apiUrl('/nfts/facets'),
    withScenario('GET /nfts/facets', ({ request }) => {
      const parsed = parseQuery(new URL(request.url).searchParams)
      if (!parsed.ok) return invalid(parsed.fieldErrors)
      return HttpResponse.json(buildFacets(getDb().nfts, parsed.value.filters))
    }),
  ),
  http.get(
    apiUrl('/nfts/featured'),
    withScenario('GET /nfts/featured', () => {
      const trending = getDb().nfts.filter((n) => n.tags.includes('trending'))
      const body: FeaturedResponse = {
        items: sortNfts(trending, 'recent').slice(0, FEATURED_COUNT).map(toSummary),
      }
      return HttpResponse.json(body)
    }),
  ),
  http.get(
    apiUrl('/nfts/:id'),
    withScenario('GET /nfts/:id', ({ params }) => {
      const nft = getDb().nfts.find((n) => n.id === params.id)
      return nft ? HttpResponse.json(nft) : errorResponse(404, 'NOT_FOUND', 'NFT não encontrado')
    }),
  ),
]
