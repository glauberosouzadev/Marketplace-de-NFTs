import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useFocusReturn } from '@/lib/use-focus-return'
import { Dialog, DialogContent, DialogTitle } from '@/ui/dialog'
import { ReceiptView } from './receipt-view'

interface ReceiptDialogProps {
  uid: string
  orderId: string
  /** Início renderizado atrás do modal (só em ≥ 1024 px). */
  background: ReactNode
}

/** FR-38: modal com foco preso, fechamento por × e Esc e foco devolvido a quem o abriu. */
export function ReceiptDialog({ uid, orderId, background }: ReceiptDialogProps) {
  const navigate = useNavigate()
  const returnFocus = useFocusReturn()

  return (
    <>
      {background}
      <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/', replace: true })}>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={returnFocus}
          className="[&>button]:text-price max-h-dvh max-w-[578px] gap-0 overflow-y-auto rounded-none border-b-[10px] p-0 sm:max-w-[578px]"
        >
          <DialogTitle className="sr-only">Recibo do pedido</DialogTitle>
          <ReceiptView uid={uid} orderId={orderId} />
        </DialogContent>
      </Dialog>
    </>
  )
}
