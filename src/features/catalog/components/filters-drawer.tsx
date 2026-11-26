import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/sheet'
import { useCatalogSearch } from '../use-catalog-search'
import { FiltersPanel, type FilterValues } from './filters-panel'

const pickFilters = ({ collection, network, priceMin, priceMax }: FilterValues): FilterValues => ({
  collection,
  network,
  priceMin,
  priceMax,
})

/** < 1024 px: edita um rascunho; só "Aplicar filtros" grava na URL, fechar descarta. */
export function FiltersDrawer() {
  const { search, update } = useCatalogSearch()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FilterValues>(() => pickFilters(search))

  const onOpenChange = (next: boolean) => {
    if (next) setDraft(pickFilters(search))
    setOpen(next)
  }
  const apply = () => {
    update(draft)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Filtros"
          className="bg-primary-gradient text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background grid size-[50px] shrink-0 place-items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <SlidersHorizontal aria-hidden className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88%] overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription className="sr-only">
            Refine o catálogo por coleção, faixa de preço e rede.
          </SheetDescription>
        </SheetHeader>
        <FiltersPanel
          context={search}
          values={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          priceApplyButton={false}
        />
        <SheetFooter>
          <Button type="button" onClick={apply}>
            Aplicar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
