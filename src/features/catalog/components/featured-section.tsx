import { useFeatured } from '../queries'
import { useMediaQuery } from '../use-media-query'
import { FeaturedCarousel } from './featured-carousel'
import { Hero } from './hero'
import { HeroSkeleton } from './hero-skeleton'

export function FeaturedSection({ onExplore }: { onExplore: () => void }) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const { data, isPending, isError, refetch } = useFeatured()

  if (isPending) return <HeroSkeleton desktop={desktop} />
  if (isError || !data) {
    return (
      <div role="alert" className="mb-6 flex h-[240px] items-center justify-center gap-3 text-sm lg:mb-12 lg:h-[450px]">
        <span className="text-muted-foreground">Não foi possível carregar os destaques.</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-primary focus-visible:ring-ring rounded-sm font-bold outline-none focus-visible:ring-2"
        >
          Tentar novamente
        </button>
      </div>
    )
  }
  return desktop ? (
    <Hero nft={data.items[0]} onExplore={onExplore} />
  ) : (
    <FeaturedCarousel items={data.items.slice(0, 3)} onExplore={onExplore} />
  )
}
