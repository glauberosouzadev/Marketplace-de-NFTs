import { useId, useState } from 'react'
import type { CartItem, CartResponse, QuoteLine } from '@/contracts'
import { useNft } from '@/features/nft-detail/queries'
import { CouponField } from '@/features/quote/components/coupon-field'
import { OrderSummary } from '@/features/quote/components/order-summary'
import { SummaryError } from '@/features/quote/components/summary-error'
import { SummarySkeleton } from '@/features/quote/components/summary-skeleton'
import { Skeleton } from '@/ui/skeleton'
import type { OrderReview as Review } from '../use-order-review'
import { StaleDiff } from './stale-diff'

/** Altura da linha do item (PNG desktop); o skeleton usa a mesma. */
const LINE_HEIGHT = 'h-[72px]'

/** FR-55: item esgotado marcado na própria linha, em texto (não só cor). */
export function SoldOutMark({ line }: { line: Pick<QuoteLine, 'available'> }) {
  if (line.available > 0) return null
  return (
    <span className="border-warning text-warning shrink-0 rounded-sm border px-1.5 text-xs font-bold">
      Esgotado
    </span>
  )
}

function ReviewLine({ line, item }: { line: QuoteLine; item: CartItem | undefined }) {
  const { data: nft } = useNft(line.nftId)
  const name = item?.name ?? nft?.name ?? line.nftId

  return (
    <li
      className={`bg-card flex ${LINE_HEIGHT} items-center gap-2 overflow-hidden rounded-3xl p-1 pr-3 lg:rounded-none`}
    >
      {item && (
        <img
          src={item.image.url}
          alt={item.image.alt}
          loading="lazy"
          className="size-16 shrink-0 rounded-2xl object-cover lg:rounded-sm"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex min-w-0 items-center gap-2 text-sm font-bold">
          <span className="truncate">{name}</span>
          <SoldOutMark line={line} />
        </p>
        {nft ? (
          <p className="text-muted-foreground truncate text-xs">ID do token: #{nft.tokenId}</p>
        ) : (
          <Skeleton className="h-4 w-28" />
        )}
      </div>
      <span aria-hidden className="text-muted-foreground shrink-0 text-xs">
        (x {line.quantity})
      </span>
      <span className="sr-only">Quantidade: {line.quantity}.</span>
      <span className="text-price shrink-0 text-base font-bold whitespace-nowrap">
        {line.lineTotal} ETH
      </span>
    </li>
  )
}

interface CouponToggleProps {
  appliedCode: string | undefined
  disabled: boolean
}

function CouponToggle({ appliedCode, disabled }: CouponToggleProps) {
  const [open, setOpen] = useState(false)
  if (open || appliedCode) return <CouponField appliedCode={appliedCode} applyDisabled={disabled} />
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen(true)}
      className="focus-visible:ring-ring self-center rounded-sm text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
    >
      Tem um código promocional? Aplique aqui
    </button>
  )
}

function ReviewSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus NFTs" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, key) => (
        <Skeleton key={key} className={`${LINE_HEIGHT} rounded-3xl lg:rounded-none`} />
      ))}
      <SummarySkeleton />
    </div>
  )
}

interface OrderReviewProps {
  cart: CartResponse
  review: Review
  /** Tentativa em curso: o cupom não muda a cotação que está sendo enviada. */
  locked: boolean
  onAccept: () => void
}

const keyOf = (ref: { nftId: string; editionId: string }): string => `${ref.nftId}:${ref.editionId}`

/** FR-30: itens, quantidades, cupom e valores exatamente como vêm da `Quote` (RN-04). */
export function OrderReview({ cart, review, locked, onAccept }: OrderReviewProps) {
  const titleId = useId()
  const { quote, outdated, changes } = review
  const current = quote.data

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-base font-bold">
        Seus NFTs
      </h2>
      {quote.isPending ? (
        <ReviewSkeleton />
      ) : current ? (
        <>
          <div aria-hidden className="flex justify-between text-sm font-bold">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <ul aria-label="Itens do pedido" className="flex flex-col gap-3">
            {current.lines.map((line) => (
              <ReviewLine
                key={keyOf(line)}
                line={line}
                item={cart.items.find((item) => keyOf(item) === keyOf(line))}
              />
            ))}
          </ul>
          <CouponToggle appliedCode={cart.couponCode} disabled={locked} />
          <OrderSummary quote={current} items={cart.items} />
        </>
      ) : (
        <SummaryError onRetry={() => void quote.refetch()} />
      )}
      {outdated && (
        <StaleDiff changes={changes} canAccept={current !== undefined} onAccept={onAccept} />
      )}
    </section>
  )
}
