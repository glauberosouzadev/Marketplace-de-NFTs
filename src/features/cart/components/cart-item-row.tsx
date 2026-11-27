import { Minus, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import type { CartItem } from '@/contracts'
import { useNft } from '@/features/nft-detail/queries'
import { errorMessage } from '@/http/error-messages'
import { isApiError, isSessionExpired } from '@/http/normalize-error'
import { canDecrement, canIncrement, limitMessage } from '@/lib/quantity'
import { noticeBus } from '@/realtime/notices'
import { useRemoveCartItem, useUpdateCartItem } from '../mutations'

/** Altura única da linha; o skeleton usa a mesma para não deslocar o layout. */
export const CART_ROW_HEIGHT = 'h-[120px]'

const circleClass =
  'grid size-6 place-items-center rounded-full bg-primary text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:brightness-100'

function announce(line: string, text: string, politeness: 'polite' | 'assertive'): void {
  const id = `cart-line-${line}`
  noticeBus.dismiss(id)
  noticeBus.publish({ id, politeness, text })
}

const failureText = (error: unknown): string =>
  errorMessage(isApiError(error) ? error.code : 'TRANSIENT')

export function CartItemRow({ item }: { item: CartItem }) {
  const messageId = useId()
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const { data: nft } = useNft(item.nftId)
  const editionLabel = nft?.editions.find((e) => e.id === item.editionId)?.label

  // Sem o rótulo carregado, o editionId evita rótulos idênticos entre edições (RN-03).
  const label = `${item.name} (edição ${editionLabel ?? item.editionId})`
  const line = `${item.nftId}:${item.editionId}`
  const busy = update.isPending || remove.isPending
  // Durante a alteração mostra o valor pedido; se a API falhar volta sozinho ao do carrinho.
  const quantity = update.isPending ? update.variables.quantity : item.quantity
  const atLimit = !canIncrement(quantity, item.available)

  // mutateAsync: o aviso não depende de a linha continuar montada.
  const run = (action: Promise<unknown>, successText: string): void => {
    action.then(
      () => announce(line, successText, 'polite'),
      (error: unknown) => {
        if (!isSessionExpired(error)) announce(line, failureText(error), 'assertive')
      },
    )
  }

  const change = (next: number): void =>
    run(
      update.mutateAsync({ nftId: item.nftId, editionId: item.editionId, quantity: next }),
      `Quantidade de ${label} alterada para ${next}.`,
    )

  const removeItem = (): void =>
    run(
      remove.mutateAsync({ nftId: item.nftId, editionId: item.editionId }),
      `${label} removido do carrinho.`,
    )

  return (
    <li className="flex flex-col gap-1">
      <div className={`bg-card flex ${CART_ROW_HEIGHT} overflow-hidden rounded-3xl lg:rounded-md`}>
        <img
          src={item.image.url}
          alt={item.image.alt}
          loading="lazy"
          className="h-full w-[100px] shrink-0 object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3">
          <h2 className="line-clamp-2 text-sm font-bold">{item.name}</h2>
          <p className="text-muted-foreground min-h-5 text-sm">
            {editionLabel ? `Edição: ${editionLabel}` : null}
          </p>
          <p className="text-price text-lg font-bold">{item.unitPrice} ETH</p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between py-3 pr-3">
          <button
            type="button"
            aria-label={`Remover ${label} do carrinho`}
            disabled={busy}
            onClick={removeItem}
            className="text-primary focus-visible:ring-ring grid size-6 place-items-center rounded-full outline-none focus-visible:ring-2 disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
          <div
            role="group"
            aria-label={`Quantidade de ${label}`}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              aria-label={`Diminuir quantidade de ${label}`}
              disabled={busy || !canDecrement(quantity)}
              onClick={() => change(quantity - 1)}
              className={circleClass}
            >
              <Minus aria-hidden className="size-3.5" />
            </button>
            <span aria-label="Quantidade" className="w-4 text-center text-base font-bold">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`Aumentar quantidade de ${label}`}
              aria-describedby={atLimit ? messageId : undefined}
              disabled={busy}
              aria-disabled={atLimit || undefined}
              onClick={() => !atLimit && change(quantity + 1)}
              className={circleClass}
            >
              <Plus aria-hidden className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
      <p id={messageId} className="text-muted-foreground px-3 text-xs empty:hidden">
        {atLimit ? limitMessage(item.available) : null}
      </p>
    </li>
  )
}
