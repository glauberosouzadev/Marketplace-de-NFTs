import { z } from 'zod'
import type { ListNftsQuery } from './api'

const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
const DECIMAL = /^\d+(\.\d{1,18})?$/

/** Aceita valor único ou lista; qualquer outra coisa vira lista vazia. */
const list = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(item)).catch([])

const decimal = z
  .string()
  .regex(DECIMAL)
  .optional()
  .catch(undefined)

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(100).catch(''),
  collection: list(z.string().min(1)),
  network: list(z.enum(NETWORKS)),
  priceMin: decimal,
  priceMax: decimal,
  tab: z.enum(['all', 'new', 'trending']).catch('all'),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).catch('recent'),
  page: z.coerce.number().int().min(1).catch(1),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 12

/** Converte o estado da URL em parâmetros de consulta (omite campos vazios). */
export function toListQuery(search: CatalogSearch): ListNftsQuery {
  return {
    ...(search.q ? { q: search.q } : {}),
    ...(search.collection.length ? { collection: search.collection } : {}),
    ...(search.network.length ? { network: search.network } : {}),
    ...(search.priceMin ? { priceMin: search.priceMin } : {}),
    ...(search.priceMax ? { priceMax: search.priceMax } : {}),
    tab: search.tab,
    sort: search.sort,
    page: search.page,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

/** RN-16: mudar qualquer campo exceto `page` zera `page`. */
export function patchSearch(current: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  const next = { ...current, ...patch }
  const filtersChanged = (Object.keys(patch) as Array<keyof CatalogSearch>).some(
    (k) => k !== 'page' && !sameValue(current[k], next[k]),
  )
  return filtersChanged ? { ...next, page: 1 } : next
}
