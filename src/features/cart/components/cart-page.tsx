import { useId } from 'react'
import type { Scope } from '@/app/query-keys'
import type { CartResponse } from '@/contracts'
import { CheckoutCta } from '@/features/quote/components/checkout-cta'
import { CouponField } from '@/features/quote/components/coupon-field'
import { OrderSummary } from '@/features/quote/components/order-summary'
import { SummaryError } from '@/features/quote/components/summary-error'
import { SummarySkeleton } from '@/features/quote/components/summary-skeleton'
import { useQuote } from '@/features/quote/queries'
import { hasBlockingIssue } from '@/features/quote/presentation'
import { BackButton } from '@/ui/shell/back-button'
import { currentCartScope } from '../mutations'
import { useCart } from '../queries'
import { CartEmpty } from './cart-empty'
import { CartError } from './cart-error'
import { CartItemRow } from './cart-item-row'
import { CartSkeleton } from './cart-skeleton'

function QuoteSummary({ scope, cart }: { scope: Scope; cart: CartResponse }) {
  const quote = useQuote(scope, cart)
  const issuesId = useId()
  const empty = cart.items.length === 0
  const blocked = quote.data ? hasBlockingIssue(quote.data) : false

  return (
    <>
      <CouponField appliedCode={cart.couponCode} applyDisabled={empty} />
      {quote.isPending ? (
        <SummarySkeleton />
      ) : quote.data ? (
        <OrderSummary quote={quote.data} items={cart.items} issuesId={issuesId} />
      ) : (
        <SummaryError onRetry={() => void quote.refetch()} />
      )}
      <CheckoutCta
        disabled={empty || !quote.data || blocked}
        describedBy={blocked ? issuesId : undefined}
      />
    </>
  )
}

/** Sheet inferior no mobile/tablet (PNG); coluna lateral a partir de lg (SDD-12). */
function SummaryPanel({ scope, cart }: { scope: Scope; cart: CartResponse | undefined }) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      className="bg-card sticky bottom-0 z-30 -mx-6 mt-auto flex flex-col gap-5 rounded-t-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:mt-0 lg:rounded-md lg:p-6"
    >
      <h2 id={titleId} className="sr-only">
        Resumo do pedido
      </h2>
      {cart ? (
        <QuoteSummary scope={scope} cart={cart} />
      ) : (
        <>
          <CouponField appliedCode={undefined} applyDisabled />
          <SummarySkeleton />
          <CheckoutCta disabled />
        </>
      )}
    </section>
  )
}

export function CartPage() {
  const scope = currentCartScope()
  const { data, isPending, refetch } = useCart(scope)

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-6 pt-6 lg:py-10">
      <div className="relative flex items-center justify-center lg:justify-start">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-xl font-bold">Carrinho de NFTs</h1>
      </div>
      <div className="flex flex-1 flex-col gap-6 lg:grid lg:flex-none lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        {isPending ? (
          <CartSkeleton />
        ) : !data ? (
          <CartError onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <CartEmpty />
        ) : (
          <ul className="flex flex-col gap-4">
            {data.items.map((item) => (
              <CartItemRow key={`${item.nftId}:${item.editionId}`} item={item} />
            ))}
          </ul>
        )}
        {(isPending || data) && <SummaryPanel scope={scope} cart={data} />}
      </div>
    </main>
  )
}
