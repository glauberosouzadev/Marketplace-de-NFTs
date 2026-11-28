import { Skeleton } from '@/ui/skeleton'

/** Mesmas dimensões do recibo: cabeçalho, faixa de dados, três itens e totais. */
export function ReceiptSkeleton() {
  return (
    <div role="status" aria-label="Carregando recibo" className="flex flex-col">
      <div className="flex flex-col items-center gap-4 px-6 pt-10 pb-6">
        <Skeleton className="h-20 w-16" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>
      <Skeleton className="mx-6 h-10 rounded-none lg:mx-11" />
      <div className="flex flex-col gap-3 px-6 pt-8 pb-10 lg:px-11">
        {Array.from({ length: 3 }, (_, key) => (
          <Skeleton key={key} className="h-[70px] rounded-sm" />
        ))}
        <Skeleton className="h-12 w-full rounded-none" />
      </div>
    </div>
  )
}
