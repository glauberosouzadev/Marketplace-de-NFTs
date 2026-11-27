import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toListQuery, type CatalogSearch } from '@/contracts'
import { TabBar } from '@/ui/shell/tab-bar'
import { CatalogEmpty } from './components/catalog-empty'
import { CatalogError } from './components/catalog-error'
import { CatalogTabs } from './components/catalog-tabs'
import { CatalogSkeleton } from './components/catalog-skeleton'
import { CatalogUpdating } from './components/catalog-updating'
import { FeaturedSection } from './components/featured-section'
import { FiltersDrawer } from './components/filters-drawer'
import { FiltersSidebar } from './components/filters-sidebar'
import { NftGrid } from './components/nft-grid'
import { Pagination } from './components/pagination'
import { SearchField } from './components/search-field'
import { SortSelect } from './components/sort-select'
import { clampPage, shouldShowEmpty } from './pagination'
import { shouldPrioritizeGrid } from './image-priority'
import { useFeatured, useNfts } from './queries'
import { useCatalogSearch } from './use-catalog-search'

const CLEARED: Partial<CatalogSearch> = {
  q: '',
  collection: [],
  network: [],
  priceMin: undefined,
  priceMax: undefined,
  tab: 'all',
  sort: 'recent',
  page: 1,
}

export function CatalogPage() {
  const navigate = useNavigate()
  const { search, update } = useCatalogSearch()
  const { data, isPending, isError, isFetching, refetch } = useNfts(toListQuery(search))

  const featured = useFeatured()
  const prioritizeFirst = shouldPrioritizeGrid(featured)

  const corrected = data ? clampPage(search.page, data.totalPages) : null
  useEffect(() => {
    if (corrected !== null)
      void navigate({ to: '/', search: (prev) => ({ ...prev, page: corrected }), replace: true })
  }, [corrected, navigate])

  const topRef = useRef<HTMLElement>(null)
  const focusCatalog = () => {
    topRef.current?.focus({ preventScroll: true })
    topRef.current?.scrollIntoView({ block: 'start' })
  }
  const goToPage = (page: number) => {
    void navigate({ to: '/', search: (prev) => ({ ...prev, page }) })
    focusCatalog()
  }
  const clearFilters = () => update(CLEARED)

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pt-6 pb-[120px] lg:pb-12">
      <div className="mb-6 flex items-center gap-3 lg:hidden">
        <SearchField placeholder="Explorar coleções" className="flex-1" />
        <FiltersDrawer />
      </div>
      <FeaturedSection onExplore={focusCatalog} />
      <div className="lg:flex lg:items-start lg:gap-6">
        <FiltersSidebar />
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CatalogTabs />
            <SortSelect />
          </div>
          <section
            ref={topRef}
            tabIndex={-1}
            aria-label="Catálogo de NFTs"
            className="outline-none"
          >
            <CatalogUpdating active={isFetching && !isPending} />
            {isPending || (data && corrected !== null && data.items.length === 0) ? (
              <CatalogSkeleton />
            ) : isError && !data ? (
              <CatalogError onRetry={() => void refetch()} />
            ) : data && shouldShowEmpty(data.items.length, corrected) ? (
              <CatalogEmpty onClear={clearFilters} />
            ) : data ? (
              <>
                {isError && <CatalogError compact onRetry={() => void refetch()} />}
                <NftGrid items={data.items} prioritizeFirst={prioritizeFirst} />
                <Pagination page={search.page} totalPages={data.totalPages} onChange={goToPage} />
              </>
            ) : null}
          </section>
        </div>
      </div>
      <TabBar />
    </main>
  )
}
