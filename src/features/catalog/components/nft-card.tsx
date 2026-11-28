import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { CardActions } from './card-actions'

interface NftCardProps {
  nft: NftSummary
  /** Primeira imagem da página: candidata a LCP. */
  priority?: boolean
}

export function NftCard({ nft, priority = false }: NftCardProps) {
  const image = nft.images[0]
  return (
    <div className="group relative">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="focus-visible:ring-ring focus-visible:ring-offset-background flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <div className="bg-card relative rounded-3xl p-1 md:rounded-none md:p-2">
          {nft.badges.includes('RARO') && (
            <span className="bg-primary text-primary-foreground absolute top-0 left-0 z-10 px-2 py-1 text-xs font-bold">
              RARO
            </span>
          )}
          {image ? (
            <img
              src={image.url}
              alt={image.alt}
              width={400}
              height={500}
              loading={priority ? 'eager' : 'lazy'}
              {...(priority ? { fetchPriority: 'high' as const } : {})}
              className="aspect-[4/5] w-full rounded-[20px] object-cover md:aspect-square md:rounded-xl"
            />
          ) : (
            <div
              aria-hidden
              className="bg-muted aspect-[4/5] w-full rounded-[20px] md:aspect-square md:rounded-xl"
            />
          )}
        </div>
        <div className="px-2 pt-3 md:px-0">
          <h2 className="truncate text-sm">{nft.name}</h2>
          <p className="text-price flex flex-wrap items-baseline gap-x-2 text-base font-bold">
            <span>{nft.priceFrom} ETH</span>
            {nft.previousPrice && (
              <span className="text-muted-foreground text-sm font-normal line-through">
                {nft.previousPrice} ETH
              </span>
            )}
          </p>
        </div>
      </Link>
      <FavoriteButton nft={nft} className="absolute top-3 right-3 z-20 md:top-4 md:right-4" />
      <CardActions nft={nft} />
    </div>
  )
}
