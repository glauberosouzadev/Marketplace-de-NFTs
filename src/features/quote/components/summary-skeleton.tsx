import { Skeleton } from '@/ui/skeleton'

/** Mesmas alturas das linhas do resumo (texto 20 px, taxa com legenda, total 28 px). */
export function SummarySkeleton() {
  return (
    <div role="status" aria-label="Calculando resumo" className="flex flex-col gap-3">
      <Skeleton className="h-5" />
      <Skeleton className="h-5" />
      <Skeleton className="h-[35px]" />
      <Skeleton className="h-7" />
    </div>
  )
}
