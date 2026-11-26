import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs'
import { useCatalogSearch } from '../use-catalog-search'

const TABS = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
] as const

export function CatalogTabs() {
  const { search, update } = useCatalogSearch()
  return (
    <Tabs
      value={search.tab}
      activationMode="manual"
      onValueChange={(tab) => update({ tab: tab as typeof search.tab })}
    >
      <TabsList aria-label="Filtrar NFTs" className="max-w-full gap-1 overflow-x-auto lg:gap-4">
        {TABS.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="px-0.5 text-[13px] lg:px-1 lg:text-sm">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
