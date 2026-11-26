import type { NftSummary } from '@/contracts'
import { NftCard } from './nft-card'

/** Grade escalonada no mobile (coluna direita mais abaixo); 3 colunas a partir de 768 px. */
export const GRID_CLASS =
  'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-8 md:gap-y-10 [&>*:nth-child(even)]:mt-12 md:[&>*:nth-child(even)]:mt-0'

export function NftGrid({
  items,
  prioritizeFirst = false,
}: {
  items: readonly NftSummary[]
  prioritizeFirst?: boolean
}) {
  return (
    <ul className={GRID_CLASS}>
      {items.map((nft, index) => (
        <li key={nft.id} className="min-w-0">
          <NftCard nft={nft} priority={prioritizeFirst && index === 0} />
        </li>
      ))}
    </ul>
  )
}
