import type { Ref } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { ApiError } from '@/contracts'
import { ORDER_STATUS_MESSAGES, errorMessage } from '@/http/error-messages'
import { Button } from '@/ui/button'
import type { CheckoutStatus } from '../checkout-machine'

interface OrderStatusPanelProps {
  status: CheckoutStatus
  error: ApiError | null
  /** Resultado desconhecido: reenvia a mesma chave (RN-07). */
  onResend: () => void
  /** Recusado: nova tentativa explícita, com nova chave. */
  onRetry: () => void
  /** Recebe o foco quando "Tentar novamente" sai da tela. */
  ref?: Ref<HTMLDivElement>
}

function statusText(status: CheckoutStatus, error: ApiError | null): string | null {
  if (status === 'pending') return ORDER_STATUS_MESSAGES.pending
  if (status === 'rejected') return ORDER_STATUS_MESSAGES.rejected
  if (status === 'verifying') return errorMessage(error?.code ?? 'TRANSIENT')
  return null
}

/** FR-33: estado do pedido em texto na região `status` (nunca só por cor). */
export function OrderStatusPanel({ status, error, onResend, onRetry, ref }: OrderStatusPanelProps) {
  const text = statusText(status, error)
  const action = status === 'verifying' ? onResend : status === 'rejected' ? onRetry : null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="focus-visible:ring-ring flex flex-col gap-3 rounded-sm outline-none focus-visible:ring-2"
    >
      <p role="status" className="flex items-center gap-2 text-sm empty:hidden">
        {status === 'pending' && (
          <LoaderCircle
            aria-hidden
            className="text-price size-4 shrink-0 animate-spin motion-reduce:animate-none"
          />
        )}
        {text}
      </p>
      {action && (
        <Button type="button" variant="outline" size="sm" onClick={action} className="self-start">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
