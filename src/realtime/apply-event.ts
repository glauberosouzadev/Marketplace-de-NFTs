import type { QueryClient } from '@tanstack/react-query'
import { queryKeys, type Scope } from '@/app/query-keys'
import type {
  CartItem,
  CartResponse,
  KurioEvent,
  Nft,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
} from '@/contracts'
import { compare, parse } from '@/contracts/decimal'
import type { Notice } from './notices'

export interface ApplyEventDeps {
  queryClient: QueryClient
  /** Escopo do carrinho/cotação; `['user', uid]` também identifica o dono dos pedidos. */
  scope: Scope
  notices: { publish: (notice: Notice) => void }
}

type EditionUpdate = NftUpdatedEvent['data']['editions'][number]

const samePrice = (a: string, b: string): boolean => compare(parse(a), parse(b)) === 0

function cartNotice(
  event: NftUpdatedEvent,
  item: CartItem,
  update: EditionUpdate,
  previous: Nft | undefined,
): Notice | null {
  const id = `${event.id}:${item.editionId}`
  if (update.available === 0) {
    // O evento traz todas as edições: linha que já estava esgotada não repete o aviso.
    if (item.available === 0) return null
    const label = previous?.editions.find((e) => e.id === item.editionId)?.label
    const subject = label ? `${item.name} (${label})` : item.name
    return { id, politeness: 'assertive', text: `${subject} esgotou.` }
  }
  if (samePrice(update.price, item.unitPrice)) return null
  return {
    id,
    politeness: 'polite',
    text: `Preço de ${item.name} mudou: ${item.unitPrice} → ${update.price} ETH.`,
  }
}

function patchNft(nft: Nft, event: NftUpdatedEvent): Nft {
  const { priceFrom, previousPrice, editions } = event.data
  const patched: Nft = {
    ...nft,
    priceFrom,
    version: event.version,
    editions: nft.editions.map((edition) => {
      const update = editions.find((e) => e.id === edition.id)
      return update
        ? {
            ...edition,
            price: update.price,
            available: update.available,
            soldOut: update.available === 0,
          }
        : edition
    }),
  }
  if (previousPrice === undefined) delete patched.previousPrice
  else patched.previousPrice = previousPrice
  return patched
}

function applyNft(event: NftUpdatedEvent, { queryClient, scope, notices }: ApplyEventDeps): void {
  const nftKey = queryKeys.nft(event.resource.id)
  const previous = queryClient.getQueryData<Nft>(nftKey)
  const cart = queryClient.getQueryData<CartResponse>(queryKeys.cart(scope))
  cart?.items
    .filter((item) => item.nftId === event.resource.id)
    .forEach((item) => {
      const update = event.data.editions.find((e) => e.id === item.editionId)
      const notice = update && cartNotice(event, item, update, previous)
      if (notice) notices.publish(notice)
    })

  if (previous) queryClient.setQueryData<Nft>(nftKey, patchNft(previous, event))
  ;[
    ['public', 'nfts'],
    queryKeys.featured(),
    ['public', 'facets'],
    queryKeys.cart(scope),
    [...scope, 'quote'],
  ].forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
}

const ORDER_NOTICES: Partial<Record<Order['status'], Omit<Notice, 'id'>>> = {
  confirmed: { politeness: 'polite', text: 'Pedido confirmado.' },
  rejected: { politeness: 'assertive', text: 'Pedido recusado.' },
}

function applyOrder(
  event: OrderUpdatedEvent,
  { queryClient, scope, notices }: ApplyEventDeps,
): void {
  if (scope[0] !== 'user') return
  queryClient.setQueryData<Order>(queryKeys.order(scope[1], event.resource.id), (prev) =>
    prev ? { ...prev, ...event.data, version: event.version } : prev,
  )
  const notice = ORDER_NOTICES[event.data.status]
  if (notice) notices.publish({ id: event.id, ...notice })
}

/** Aplica no cache um evento já aceito pelo reconciliador (SDD-09 passos 3 e 4). */
export function applyEvent(event: KurioEvent, deps: ApplyEventDeps): void {
  if (event.type === 'nft.updated') applyNft(event, deps)
  else applyOrder(event, deps)
}
