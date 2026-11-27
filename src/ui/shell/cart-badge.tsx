import { useCartCount, cartCountLabel } from '@/features/cart/use-cart-count'

/** Selo numérico (oculto em 0) e anúncio polite da contagem; o rótulo do link continua "Carrinho". */
export function CartBadge() {
  const { count, loaded } = useCartCount()
  return (
    <>
      {count > 0 && (
        <span
          aria-hidden
          className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-bold"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span role="status" className="sr-only">
        {loaded ? cartCountLabel(count) : ''}
      </span>
    </>
  )
}
