import { useState } from 'react'
import { Slider } from '@/ui/slider'
import { Button } from '@/ui/button'
import {
  boundsToSteps,
  formatRange,
  paramsToRange,
  rangeToParams,
  type PriceBounds,
  type PriceRange as Range,
} from '../price-range'

interface PriceRangeProps {
  bounds: PriceBounds
  priceMin: string | undefined
  priceMax: string | undefined
  /** `onApply` dispara com o botão "Aplicar"; sem ele, cada ajuste confirmado do slider é entregue. */
  onApply: (params: { priceMin: string | undefined; priceMax: string | undefined }) => void
  showApplyButton?: boolean
}

export function PriceRangeField({
  bounds,
  priceMin,
  priceMax,
  onApply,
  showApplyButton = true,
}: PriceRangeProps) {
  const applied = paramsToRange(bounds, priceMin, priceMax)
  const [range, setRange] = useState<Range>(applied)
  const [seen, setSeen] = useState(applied.join(':'))

  // URL ou limites mudaram (voltar/avançar, outro filtro): o rascunho acompanha.
  if (applied.join(':') !== seen) {
    setSeen(applied.join(':'))
    setRange(applied)
  }

  const [boundLo, boundHi] = boundsToSteps(bounds)
  const commit = (next: Range) => onApply(rangeToParams(bounds, next))

  return (
    <div className="flex flex-col gap-4">
      <Slider
        min={boundLo}
        max={boundHi}
        step={1}
        value={[...range]}
        disabled={boundLo === boundHi}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        onValueChange={(v) => setRange([v[0] ?? boundLo, v[1] ?? boundHi])}
        onValueCommit={
          showApplyButton ? undefined : (v) => commit([v[0] ?? boundLo, v[1] ?? boundHi])
        }
      />
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {formatRange(range)}
      </p>
      {showApplyButton && (
        <Button type="button" size="sm" className="self-start" onClick={() => commit(range)}>
          Aplicar
        </Button>
      )}
    </div>
  )
}
