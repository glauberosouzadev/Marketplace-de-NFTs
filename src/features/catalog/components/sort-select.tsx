import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { useCatalogSearch } from '../use-catalog-search'

const OPTIONS = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price_asc', label: 'Preço crescente' },
  { value: 'price_desc', label: 'Preço decrescente' },
] as const

export function SortSelect() {
  const { search, update } = useCatalogSearch()
  return (
    <div className="flex items-center gap-2 text-sm">
      <span id="sort-label">Ordenar por:</span>
      <Select value={search.sort} onValueChange={(sort) => update({ sort: sort as typeof search.sort })}>
        <SelectTrigger aria-labelledby="sort-label" className="w-[220px] lg:w-[240px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
