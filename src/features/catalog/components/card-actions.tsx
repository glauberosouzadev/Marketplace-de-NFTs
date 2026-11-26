import { Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'
import type { NftSummary } from '@/contracts'
import { ACTION_BUTTON_CLASS, ImageZoomDialog } from './image-zoom-dialog'

/** Irmãs do link do card (sem botão dentro de `<a>`); visíveis no hover e no foco. */
export function CardActions({ nft }: { nft: NftSummary }) {
  const zoomImage = nft.images[1] ?? nft.images[0]
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex aspect-[4/5] items-end justify-center gap-2 p-4 opacity-0 transition-opacity motion-reduce:transition-none group-focus-within:opacity-100 group-hover:opacity-100 md:aspect-square md:p-5 group-focus-within:[&>*]:pointer-events-auto group-hover:[&>*]:pointer-events-auto">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className={ACTION_BUTTON_CLASS}
        aria-label={`Ver edições de ${nft.name}`}
      >
        <ShoppingCartIcon className="size-5" aria-hidden="true" />
      </Link>
      {zoomImage && <ImageZoomDialog nftName={nft.name} image={zoomImage} />}
    </div>
  )
}
