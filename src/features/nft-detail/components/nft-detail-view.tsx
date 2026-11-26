import { isApiError } from '@/http/normalize-error'
import { BackButton } from '@/ui/shell/back-button'
import { useNft } from '../queries'
import { NftDetailError } from './nft-detail-error'
import { NftDetailSkeleton } from './nft-detail-skeleton'
import { NftNotFound } from './nft-not-found'
import { NftPurchaseLayout } from './nft-purchase-layout'

const isNotFound = (error: unknown): boolean =>
  isApiError(error) && error.kind === 'http' && error.status === 404

interface NftDetailViewProps {
  nftId: string
  editionId: string | undefined
  onEditionChange: (editionId: string) => void
}

export function NftDetailView({ nftId, editionId, onEditionChange }: NftDetailViewProps) {
  const { data, error, isPending, refetch } = useNft(nftId)

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-6 py-6 lg:py-10">
      <BackButton />
      {isPending ? (
        <NftDetailSkeleton />
      ) : data ? (
        <NftPurchaseLayout
          key={data.id}
          nft={data}
          editionId={editionId}
          onEditionChange={onEditionChange}
        />
      ) : isNotFound(error) ? (
        <NftNotFound />
      ) : (
        <NftDetailError onRetry={() => void refetch()} />
      )}
    </main>
  )
}
