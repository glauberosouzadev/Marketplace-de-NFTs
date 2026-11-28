import { createFileRoute } from '@tanstack/react-router'
import { walletsSearchSchema } from '@/contracts/search'
import { WalletsPage } from '@/features/wallets/components/wallets-page'
import { requireSession } from '@/features/session/guard'

function CarteirasRoute() {
  const { user } = Route.useRouteContext()
  const { redirect } = Route.useSearch()
  return <WalletsPage uid={user.id} returnTo={redirect === '/' ? undefined : redirect} />
}

export const Route = createFileRoute('/carteiras')({
  validateSearch: walletsSearchSchema,
  beforeLoad: ({ context, location }) => requireSession(context, location),
  component: CarteirasRoute,
})
