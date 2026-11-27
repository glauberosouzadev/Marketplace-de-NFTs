import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Nft } from '@/contracts'
import { useAddToCart } from '@/features/cart/mutations'
import { errorMessage } from '@/http/error-messages'
import { isApiError, isSessionExpired } from '@/http/normalize-error'
import { noticeBus } from '@/realtime/notices'
import { adjustedMessage, fitToLimit, parseQuantity, resolveEdition } from '@/lib/quantity'
import { EditionPicker } from './edition-picker'
import { NftGallery } from './nft-gallery'
import { NftInfo } from './nft-info'
import { PurchaseBar } from './purchase-bar'

const CART_NOTICE_ID = 'cart-add'

function announce(text: string, politeness: 'polite' | 'assertive'): void {
  noticeBus.dismiss(CART_NOTICE_ID)
  noticeBus.publish({ id: CART_NOTICE_ID, politeness, text })
}

const failureText = (error: unknown): string =>
  errorMessage(isApiError(error) ? error.code : 'TRANSIENT')

interface NftPurchaseLayoutProps {
  nft: Nft
  editionId: string | undefined
  onEditionChange: (editionId: string) => void
}

/** Estado de compra do detalhe: edição (na URL), quantidade e adicionar ao carrinho (FR-11..13). */
export function NftPurchaseLayout({ nft, editionId, onEditionChange }: NftPurchaseLayoutProps) {
  const [draft, setDraft] = useState('1')
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  const edition = resolveEdition(nft.editions, editionId)
  const max = edition?.available ?? 0
  const parsed = parseQuantity(draft, max)

  const selectEdition = (id: string): void => {
    const next = nft.editions.find((e) => e.id === id)
    if (!next) return
    if (parsed.ok) {
      const fit = fitToLimit(parsed.value, next.available)
      if (fit.adjusted) {
        setDraft(String(fit.value))
        announce(adjustedMessage(fit.value), 'polite')
      }
    }
    onEditionChange(id)
  }

  const add = (openCart: boolean): void => {
    if (!edition || !parsed.ok) return
    const quantity = parsed.value
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          if (openCart) return void navigate({ to: '/carrinho' })
          announce(
            `Adicionado ao carrinho: ${nft.name}, edição ${edition.label}, quantidade ${quantity}.`,
            'polite',
          )
        },
        onError: (error) => {
          if (!isSessionExpired(error)) announce(failureText(error), 'assertive')
        },
      },
    )
  }

  return (
    <div className="grid gap-6 pb-56 lg:grid-cols-2 lg:gap-12 lg:pb-0">
      <NftGallery images={nft.images} />
      <div className="flex flex-col gap-6">
        <NftInfo nft={nft}>
          <EditionPicker
            editions={nft.editions}
            selectedId={edition?.id}
            onSelect={selectEdition}
          />
        </NftInfo>
        <PurchaseBar
          price={edition?.price ?? nft.priceFrom}
          draft={draft}
          max={max}
          soldOut={!edition}
          canAdd={Boolean(edition) && parsed.ok}
          pending={addToCart.isPending}
          onDraftChange={setDraft}
          onAdd={() => add(false)}
          onBuy={() => add(true)}
        />
      </div>
    </div>
  )
}
