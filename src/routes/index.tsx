import { createFileRoute, stripSearchParams, type SearchSchemaInput } from '@tanstack/react-router'
import { catalogSearchSchema, type CatalogSearch } from '@/contracts'
import { CatalogPage } from '@/features/catalog/catalog-page'

const CATALOG_SEARCH_DEFAULTS: Partial<CatalogSearch> = {
  q: '',
  collection: [],
  network: [],
  tab: 'all',
  sort: 'recent',
  page: 1,
}

export const Route = createFileRoute('/')({
  // SearchSchemaInput marca a entrada como parcial: links para "/" não precisam informar a busca.
  validateSearch: (search: Partial<CatalogSearch> & SearchSchemaInput): CatalogSearch =>
    catalogSearchSchema.parse(search),
  // Defaults não aparecem na URL.
  search: { middlewares: [stripSearchParams(CATALOG_SEARCH_DEFAULTS)] },
  component: CatalogPage,
})
