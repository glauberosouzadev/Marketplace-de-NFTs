import { useCatalogSearch } from '../use-catalog-search'
import { FiltersPanel } from './filters-panel'

/** ≥ 1024 px (SDD-12): aplica cada alteração direto na URL. */
export function FiltersSidebar() {
  const { search, update } = useCatalogSearch()
  return (
    <aside
      aria-label="Filtros"
      className="bg-card hidden w-[310px] shrink-0 self-start p-5 lg:block"
    >
      <FiltersPanel context={search} values={search} onChange={update} />
    </aside>
  )
}
