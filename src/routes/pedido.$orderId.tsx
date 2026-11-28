import { createFileRoute } from '@tanstack/react-router'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { ReceiptDialog } from '@/features/orders/components/receipt-dialog'
import { ReceiptPage } from '@/features/orders/components/receipt-page'
import { requireSession } from '@/features/session/guard'
import { useMediaQuery } from '@/lib/use-media-query'

function PedidoRoute() {
  const { orderId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return isDesktop ? (
    <ReceiptDialog uid={user.id} orderId={orderId} background={<CatalogPage />} />
  ) : (
    <ReceiptPage uid={user.id} orderId={orderId} />
  )
}

export const Route = createFileRoute('/pedido/$orderId')({
  beforeLoad: ({ context, location }) => requireSession(context, location),
  component: PedidoRoute,
})
