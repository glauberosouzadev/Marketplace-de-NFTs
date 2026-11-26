import { ShoppingCart } from 'lucide-react'
import type { EthString } from '@/contracts'
import { QuantityStepper } from './quantity-stepper'

interface PurchaseBarProps {
  price: EthString
  draft: string
  max: number
  soldOut: boolean
  canAdd: boolean
  pending: boolean
  onDraftChange: (draft: string) => void
  onAdd: () => void
}

const SOLD_OUT_TEXT = 'Todas as edições estão esgotadas.'

/** Rodapé fixo do detalhe no mobile (PNG); no desktop vira bloco da coluna de informações. */
export function PurchaseBar({
  price,
  draft,
  max,
  soldOut,
  canAdd,
  pending,
  onDraftChange,
  onAdd,
}: PurchaseBarProps) {
  const disabled = !canAdd || pending
  return (
    <section
      aria-label="Compra"
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-5 rounded-t-3xl bg-card px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:static lg:rounded-md lg:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <QuantityStepper draft={draft} max={max} disabled={soldOut} onChange={onDraftChange} />
        <p className="text-xl font-bold whitespace-nowrap text-price">
          <span className="sr-only">Preço: </span>
          {price} ETH
        </p>
      </div>
      {soldOut && <p className="text-sm text-muted-foreground">{SOLD_OUT_TEXT}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          aria-busy={pending}
          onClick={onAdd}
          className="h-[60px] flex-1 rounded-full bg-primary-gradient px-6 text-base font-bold text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[264px] lg:h-[45px] lg:max-w-none lg:rounded-md lg:bg-primary lg:bg-none"
        >
          Comprar NFT
        </button>
        <button
          type="button"
          aria-label="Adicionar ao carrinho"
          disabled={disabled}
          aria-busy={pending}
          onClick={onAdd}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-primary outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 lg:size-[45px]"
        >
          <ShoppingCart aria-hidden className="size-5" />
        </button>
      </div>
    </section>
  )
}
