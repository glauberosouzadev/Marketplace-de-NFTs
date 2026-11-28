import { createFileRoute } from '@tanstack/react-router'
import { PaymentPage } from '@/features/checkout/components/payment-page'
import { requireCartItems } from '@/features/checkout/guard'
import { requireSession } from '@/features/session/guard'
import { noticeBus } from '@/realtime/notices'

function PagamentoRoute() {
  const { user } = Route.useRouteContext()
  return <PaymentPage uid={user.id} />
}

export const Route = createFileRoute('/pagamento')({
  beforeLoad: async ({ context, location }) => {
    const session = await requireSession(context, location)
    await requireCartItems(context.queryClient, session.user.id, noticeBus.publish)
    return session
  },
  component: PagamentoRoute,
})
