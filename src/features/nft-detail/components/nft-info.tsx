import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Nft } from '@/contracts'

/** Título, avaliação (somente leitura, Q-25), descrição, seletor de edição (`children`), ID, coleção e atributos. */
export function NftInfo({ nft, children }: { nft: Nft; children?: ReactNode }) {
  const attributes = nft.attributes.map((a) => a.value).join(', ')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-bold">{nft.name}</h1>
        <p className="border-primary text-price flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold">
          <span className="sr-only">
            Avaliação {nft.rating.score.toFixed(1)} de 5, {nft.rating.count} avaliações
          </span>
          <Star aria-hidden className="size-3.5 fill-current" />
          <span aria-hidden>
            {nft.rating.score.toFixed(1)}
            <span className="font-normal">({nft.rating.count})</span>
          </span>
        </p>
      </div>
      <p className="text-foreground text-sm">{nft.description}</p>
      {children}
      <dl className="text-muted-foreground flex flex-col gap-3 text-sm">
        <div>
          <dt className="inline">ID do token: </dt>
          <dd className="inline">#{nft.tokenId}</dd>
        </div>
        <div>
          <dt className="inline">Coleção: </dt>
          <dd className="inline">{nft.collection.name}</dd>
        </div>
        <div>
          <dt className="inline">Atributos: </dt>
          <dd className="inline">{attributes}</dd>
        </div>
      </dl>
    </div>
  )
}
