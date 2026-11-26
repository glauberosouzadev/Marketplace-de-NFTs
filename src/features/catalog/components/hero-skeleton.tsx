import { Skeleton } from '@/ui/skeleton'

/** Mesmas dimensões do hero (450 px no desktop) e do carrossel (240 px no mobile). */
export function HeroSkeleton({ desktop }: { desktop: boolean }) {
  return desktop ? (
    <div aria-busy="true" aria-label="Carregando destaque" className="mb-12 h-[450px]">
      <Skeleton className="h-full w-full" />
    </div>
  ) : (
    <div aria-busy="true" aria-label="Carregando destaques" className="mb-6 h-[240px]">
      <Skeleton className="h-full w-full rounded-3xl" />
    </div>
  )
}
