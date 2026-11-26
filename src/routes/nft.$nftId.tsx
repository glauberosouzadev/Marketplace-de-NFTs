import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NftDetailView } from '@/features/nft-detail/components/nft-detail-view'

const searchSchema = z.object({ edition: z.string().min(1).optional().catch(undefined) })

function NftDetailRoute() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <NftDetailView
      nftId={nftId}
      editionId={edition}
      onEditionChange={(id) =>
        void navigate({ search: (prev) => ({ ...prev, edition: id }), replace: true })
      }
    />
  )
}

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: searchSchema,
  component: NftDetailRoute,
})
