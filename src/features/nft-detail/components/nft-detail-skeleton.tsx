import { Skeleton } from '@/ui/skeleton'

/** Mesmas dimensões do conteúdo: imagem 4:5, título, descrição, 3 linhas e preço. */
export function NftDetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="grid gap-6 lg:grid-cols-2 lg:gap-12">
      <Skeleton className="aspect-[4/5] w-full rounded-xl lg:rounded-md" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-7 w-1/3" />
      </div>
    </div>
  )
}
