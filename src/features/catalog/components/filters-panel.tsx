import { useId } from 'react'
import type { CatalogSearch, FacetsQuery, Network } from '@/contracts'
import { Checkbox } from '@/ui/checkbox'
import { Label } from '@/ui/label'
import { Skeleton } from '@/ui/skeleton'
import { Button } from '@/ui/button'
import { useFacets } from '../queries'
import { PriceRangeField } from './price-range'

export type FilterValues = Pick<CatalogSearch, 'collection' | 'network' | 'priceMin' | 'priceMax'>

const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

interface FiltersPanelProps {
  /** Busca e aba vigentes: entram na consulta de facetas junto com os filtros em edição. */
  context: Pick<CatalogSearch, 'q' | 'tab'>
  values: FilterValues
  onChange: (patch: Partial<FilterValues>) => void
  /** Falso no drawer: o preço é confirmado pelo botão de aplicar do próprio drawer. */
  priceApplyButton?: boolean
}

const toggle = <T extends string>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

function facetsParams({ q, tab }: FiltersPanelProps['context'], values: FilterValues): FacetsQuery {
  return {
    ...(q ? { q } : {}),
    tab,
    ...(values.collection.length ? { collection: values.collection } : {}),
    ...(values.network.length ? { network: values.network } : {}),
    ...(values.priceMin ? { priceMin: values.priceMin } : {}),
    ...(values.priceMax ? { priceMax: values.priceMax } : {}),
  }
}

const sectionTitle = 'mb-3 text-lg font-bold text-foreground'

export function FiltersPanel({
  context,
  values,
  onChange,
  priceApplyButton = true,
}: FiltersPanelProps) {
  const uid = useId()
  const { data, isPending, isError, refetch } = useFacets(facetsParams(context, values))

  if (isPending) return <FiltersSkeleton />
  if (isError || !data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p>Não foi possível carregar os filtros.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className={sectionTitle}>Coleções</legend>
        <ul className="flex flex-col gap-1">
          {data.collections.map(({ id, name, count }) => (
            <FacetRow
              key={id}
              id={`${uid}-collection-${id}`}
              label={name}
              count={count}
              checked={values.collection.includes(id)}
              onCheckedChange={() => onChange({ collection: toggle(values.collection, id) })}
              emphasis
            />
          ))}
        </ul>
      </fieldset>
      <section aria-labelledby={`${uid}-price-title`}>
        <h3 id={`${uid}-price-title`} className={sectionTitle}>
          Faixa de preço
        </h3>
        <PriceRangeField
          bounds={data.price}
          priceMin={values.priceMin}
          priceMax={values.priceMax}
          onApply={onChange}
          showApplyButton={priceApplyButton}
        />
      </section>
      <fieldset>
        <legend className={sectionTitle}>Rede</legend>
        <ul className="flex flex-col gap-1">
          {data.networks.map(({ id, count }) => (
            <FacetRow
              key={id}
              id={`${uid}-network-${id}`}
              label={NETWORK_LABELS[id]}
              count={count}
              checked={values.network.includes(id)}
              onCheckedChange={() => onChange({ network: toggle(values.network, id) })}
            />
          ))}
        </ul>
      </fieldset>
    </div>
  )
}

interface FacetRowProps {
  id: string
  label: string
  count: number
  checked: boolean
  onCheckedChange: () => void
  emphasis?: boolean
}

function FacetRow({ id, label, count, checked, onCheckedChange, emphasis }: FacetRowProps) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="flex-1 cursor-pointer justify-between text-sm leading-normal">
        <span className={emphasis ? 'text-primary' : undefined}>{label}</span>
        <span className={emphasis ? 'text-primary font-bold' : 'text-muted-foreground'}>
          ({count})
        </span>
      </Label>
    </li>
  )
}

function FiltersSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando filtros" className="flex flex-col gap-3">
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  )
}
