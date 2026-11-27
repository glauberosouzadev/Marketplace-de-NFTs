import { Skeleton } from '@/ui/skeleton'
import { CART_ROW_HEIGHT } from './cart-item-row'

export function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="flex flex-col gap-4">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className={`${CART_ROW_HEIGHT} rounded-3xl lg:rounded-md`} />
      ))}
    </div>
  )
}
