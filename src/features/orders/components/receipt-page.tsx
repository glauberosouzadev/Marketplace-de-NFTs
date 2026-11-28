import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { ReceiptView } from './receipt-view'

/** Q-21: abaixo de 1024 px o recibo é uma página, com botão voltar circular ao Início. */
export function ReceiptPage({ uid, orderId }: { uid: string; orderId: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[414px] flex-1 flex-col gap-4 px-4 py-6">
      <Link
        to="/"
        aria-label="Voltar ao Início"
        className="bg-card text-primary focus-visible:ring-ring grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2"
      >
        <ChevronLeft aria-hidden className="size-5" />
      </Link>
      <h1 className="sr-only">Recibo do pedido</h1>
      <div className="bg-card border-b-primary overflow-hidden rounded-3xl border-b-[10px]">
        <ReceiptView uid={uid} orderId={orderId} />
      </div>
    </main>
  )
}
