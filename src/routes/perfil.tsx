import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/profile/components/profile-page'
import { requireSession } from '@/features/session/guard'

function PerfilRoute() {
  const { user } = Route.useRouteContext()
  return <ProfilePage uid={user.id} />
}

export const Route = createFileRoute('/perfil')({
  beforeLoad: ({ context, location }) => requireSession(context, location),
  component: PerfilRoute,
})
