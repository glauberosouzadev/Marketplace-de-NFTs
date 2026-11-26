import { CATALOG_PAGE_SIZE } from '@/contracts'
import { Skeleton } from '@/ui/skeleton'
import { GRID_CLASS } from './nft-grid'

/** Mesmas dimensões do card: imagem 4:5 (1:1 no desktop), linha de nome e de preço. */
export function CatalogSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Carregando NFTs" className={GRID_CLASS}>
      {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
        <li key={i} className="min-w-0">
          <Skeleton className="aspect-[4/5] w-full rounded-3xl md:aspect-square md:rounded-md" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-1 h-6 w-1/2" />
        </li>
      ))}
    </ul>
  )
}
