import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/favorites/components/favorites-page'
import { requireSession } from '@/features/session/guard'

function FavoritosRoute() {
  const { user } = Route.useRouteContext()
  return <FavoritesPage uid={user.id} />
}

export const Route = createFileRoute('/favoritos')({
  beforeLoad: ({ context, location }) => requireSession(context, location),
  component: FavoritosRoute,
})
