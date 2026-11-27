import type { NftSummary } from '@/contracts'

interface HeroProps {
  nft: NftSummary | undefined
  onExplore: () => void
}

/** Hero estático do desktop. */
export function Hero({ nft, onExplore }: HeroProps) {
  const image = nft?.images[0]
  return (
    <section
      aria-label="Destaque"
      className="mb-12 flex h-[450px] items-center justify-between gap-6"
    >
      <div className="max-w-[420px] px-6">
        <p className="text-sm">Bem-vindo à Kurio</p>
        <h1 className="mt-4 text-[40px] leading-[70px] font-bold uppercase">
          SEJA DONO DA ARTE DIGITAL
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          Descubra NFTs selecionados de criadores do mundo todo, arte digital verificada.
        </p>
        <button
          type="button"
          onClick={onExplore}
          className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background mt-10 h-10 rounded-sm px-7 text-sm font-bold outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          EXPLORAR
        </button>
      </div>
      {image ? (
        <img
          src={image.url}
          alt={image.alt}
          width={450}
          height={450}
          loading="eager"
          fetchPriority="high"
          className="size-[450px] shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div aria-hidden className="bg-muted size-[450px] shrink-0 rounded-xl" />
      )}
    </section>
  )
}
