import { NftGrid } from '@/features/catalog/components/nft-grid'
import { TabBar } from '@/ui/shell/tab-bar'
import { useFavorites } from '../queries'
import { FavoritesEmpty } from './favorites-empty'
import { FavoritesError } from './favorites-error'
import { FavoritesSkeleton } from './favorites-skeleton'

export function FavoritesPage({ uid }: { uid: string }) {
  const { data, isPending, isError, refetch } = useFavorites(uid)

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pt-6 pb-[120px] lg:pb-12">
      <h1 className="mb-6 text-2xl font-bold">Favoritos</h1>
      {isPending ? (
        <FavoritesSkeleton />
      ) : isError && !data ? (
        <FavoritesError onRetry={() => void refetch()} />
      ) : data && data.items.length === 0 ? (
        <FavoritesEmpty />
      ) : data ? (
        <NftGrid items={data.items.map((item) => item.nft)} />
      ) : null}
      <TabBar />
    </main>
  )
}
