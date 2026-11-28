import { useEffect, useId, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import type { ApiError, CartResponse, Collector, Wallet } from '@/contracts'
import { CartError } from '@/features/cart/components/cart-error'
import { useCart } from '@/features/cart/queries'
import { orderHref } from '@/features/orders/presentation'
import { useWallets } from '@/features/wallets/queries'
import { WalletsError, WalletsSkeleton } from '@/features/wallets/components/wallets-states'
import { errorMessage } from '@/http/error-messages'
import { Button } from '@/ui/button'
import { BackButton } from '@/ui/shell/back-button'
import { useNoticesOffset } from '@/ui/shell/use-notices-offset'
import { Skeleton } from '@/ui/skeleton'
import { canEditFields } from '../checkout-machine'
import { useCheckout } from '../use-checkout'
import { useOrderReview } from '../use-order-review'
import { walletList } from '../wallet-presentation'
import { COLLECTOR_FORM_ID, CollectorForm } from './collector-form'
import { ConnectionStatus } from './connection-status'
import { OrderReview } from './order-review'
import { OrderStatusPanel } from './order-status-panel'
import { ProviderNetworkPicker } from './provider-network-picker'
import { useWalletConnection } from './use-wallet-connection'
import { WalletPicker } from './wallet-picker'

type Checkout = ReturnType<typeof useCheckout>

const CRUMB_LINK = 'focus-visible:ring-ring outline-none focus-visible:ring-2'

function Breadcrumb() {
  return (
    <nav aria-label="Você está em" className="hidden text-sm font-bold lg:block">
      <ol className="flex items-center gap-2">
        <li>
          <Link to="/" className={CRUMB_LINK}>
            Início
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link to="/" className={CRUMB_LINK}>
            Mercado
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li aria-current="page">Pagamento</li>
      </ol>
    </nav>
  )
}

function PaymentSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando pagamento"
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_405px]"
    >
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        {Array.from({ length: 5 }, (_, key) => (
          <Skeleton key={key} className="h-[88px] rounded-3xl lg:h-[50px] lg:rounded-md" />
        ))}
      </div>
      <div className="lg:col-start-1 lg:row-start-1">
        <WalletsSkeleton />
      </div>
    </div>
  )
}

interface PaymentContentProps {
  uid: string
  wallets: readonly Wallet[]
  cart: CartResponse
  checkout: Checkout
}

// Diff, desconexão e 422 já têm texto próprio (aviso de valores, conexão e campos).
const SHOWN_ELSEWHERE: ReadonlySet<string> = new Set(['QUOTE_STALE', 'WALLET_DISCONNECTED'])

const alertText = (error: ApiError | null): string | null =>
  error && !SHOWN_ELSEWHERE.has(error.code) ? errorMessage(error.code) : null

const BUSY: ReadonlySet<string> = new Set(['revalidating', 'submitting', 'verifying'])

// O controle clicado some ao trocar de estado; o foco vai para o próximo passo após o render.
const focusNextFrame = (target: { current: HTMLElement | null }): void => {
  requestAnimationFrame(() => target.current?.focus())
}

function PaymentContent({ uid, wallets, cart, checkout }: PaymentContentProps) {
  const { draft, error, controller } = checkout
  const { state, choose, connect, disconnect } = useWalletConnection(uid, draft, controller)
  const review = useOrderReview(uid, cart, draft, controller)
  const [attempted, setAttempted] = useState(false)
  const reasonId = useId()
  const alertId = useId()
  const selected = wallets.find((wallet) => wallet.id === draft.walletId) ?? wallets[0] ?? null
  const connected = state.phase === 'connected'
  // Fora da revisão o estado do pedido é explicado pelo painel de status.
  const alert = canEditFields(draft.status) ? alertText(error) : null
  const total = review.quote.data?.total
  const barRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  useNoticesOffset(barRef)

  const selectWallet = (wallet: Wallet): void =>
    choose({ walletId: wallet.id, provider: wallet.provider, network: wallet.network })

  useEffect(() => {
    if (selected && draft.walletId !== selected.id) {
      choose({ walletId: selected.id, provider: selected.provider, network: selected.network })
    }
  }, [selected, draft.walletId, choose])

  // Formulário válido e carteira conectada: revisa e revalida a cotação exibida.
  const confirmPurchase = (collector: Collector): void => {
    setAttempted(true)
    controller.updateFields({ collector })
    if (connected) review.confirm()
  }

  const describedBy = review.reason ? reasonId : alert ? alertId : undefined

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_405px] lg:grid-rows-[auto_1fr]">
      <div className="flex flex-col gap-6 lg:col-start-2 lg:row-start-1">
        <OrderReview
          cart={cart}
          review={review}
          locked={review.block === 'locked'}
          onAccept={() => {
            review.accept()
            focusNextFrame(confirmRef)
          }}
        />
        <WalletPicker
          wallets={wallets}
          selectedId={selected?.id ?? null}
          connected={connected}
          onSelect={selectWallet}
        />
        <ProviderNetworkPicker
          provider={draft.provider}
          network={draft.network}
          onProviderChange={(provider) => choose({ provider })}
          onNetworkChange={(network) => choose({ network })}
        />
        <ConnectionStatus
          state={state}
          canConnect={Boolean(draft.walletId && draft.provider && draft.network)}
          attempted={attempted}
          onConnect={() => void connect()}
          onDisconnect={() => void disconnect()}
        />
      </div>
      <section
        aria-labelledby="collector-title"
        className="flex flex-col gap-5 lg:col-start-1 lg:row-span-2 lg:row-start-1"
      >
        <h2 id="collector-title" className="text-lg font-bold">
          Perfil do colecionador
        </h2>
        <CollectorForm
          key={selected?.id ?? 'none'}
          wallet={selected}
          collector={draft.collector}
          apiError={error}
          onChange={(collector) => controller.updateFields({ collector })}
          onValid={confirmPurchase}
        />
      </section>
      <div
        ref={barRef}
        className="bg-background sticky bottom-0 z-30 -mx-6 flex flex-col gap-3 px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:col-start-2 lg:row-start-2 lg:mx-0 lg:self-start lg:p-0"
      >
        {total && (
          <p className="flex items-center justify-end gap-6 text-lg font-bold lg:hidden">
            <span>Total:</span>
            <span className="text-price break-all">{total} ETH</span>
          </p>
        )}
        <OrderStatusPanel
          ref={statusRef}
          status={draft.status}
          error={error}
          onResend={() => {
            void controller.resend()
            focusNextFrame(statusRef)
          }}
          onRetry={() => {
            controller.retry()
            void controller.confirm()
            focusNextFrame(statusRef)
          }}
        />
        <p id={alertId} role="alert" className="text-destructive text-sm empty:hidden">
          {alert}
        </p>
        {/* Motivo do bloqueio já visível no resumo; aqui só como descrição do botão. */}
        <p id={reasonId} hidden>
          {review.reason}
        </p>
        <Button
          ref={confirmRef}
          type="submit"
          form={COLLECTOR_FORM_ID}
          variant="gradient"
          disabled={review.block !== null}
          aria-busy={BUSY.has(draft.status)}
          aria-describedby={describedBy}
          onClick={() => setAttempted(true)}
          className="lg:bg-primary w-full text-base lg:bg-none"
        >
          Confirmar compra
        </Button>
      </div>
    </div>
  )
}

export function PaymentPage({ uid }: { uid: string }) {
  const checkout = useCheckout(uid)
  const wallets = useWallets(uid)
  const router = useRouter()
  const { status, orderId } = checkout.draft

  // RN-11: o recibo só abre com `confirmed` vindo do pedido na API (GET, POST ou evento).
  useEffect(() => {
    if (status === 'confirmed' && orderId)
      void router.navigate({ ...orderHref(orderId), replace: true })
  }, [status, orderId, router])
  const cart = useCart(['user', uid])

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 pt-6 pb-10 lg:py-8">
      <div className="flex items-center gap-4">
        <BackButton />
        <h1 className="text-xl font-bold">
          <span className="lg:hidden">Pagamento com carteira</span>
          <span className="sr-only max-lg:hidden">Pagamento</span>
        </h1>
      </div>
      <Breadcrumb />
      {wallets.isPending || cart.isPending ? (
        <PaymentSkeleton />
      ) : !wallets.data ? (
        <WalletsError onRetry={() => void wallets.refetch()} />
      ) : !cart.data ? (
        <CartError onRetry={() => void cart.refetch()} />
      ) : (
        <PaymentContent
          uid={uid}
          wallets={walletList(wallets.data)}
          cart={cart.data}
          checkout={checkout}
        />
      )}
    </main>
  )
}
