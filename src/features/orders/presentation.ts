import type { Network, Order, OrderSnapshot, WalletProvider } from '@/contracts'
import { ZERO, compare, parse } from '@/contracts/decimal'
import { abbreviateAddress, networkLabel } from '@/features/checkout/wallet-presentation'
import { PROVIDER_OPTIONS } from '@/features/wallets/validation'

/** Destino tipado do recibo (FR-35); `orderId` vira segmento de rota e é codificado pelo router. */
export const orderHref = (orderId: string) =>
  ({ to: '/pedido/$orderId', params: { orderId } }) as const

const EXPLORER_NAME: Record<Network, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

export const explorerName = (network: Network): string => EXPLORER_NAME[network]

export const providerLabel = (provider: WalletProvider): string =>
  PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ?? provider

/** FR-36: a linha de "Desconto" só aparece com valor maior que 0. */
export const hasDiscount = (snapshot: Pick<OrderSnapshot, 'discount'>): boolean =>
  compare(parse(snapshot.discount), ZERO) === 1

export const confirmationText = (network: Network): string =>
  `Transação confirmada na ${networkLabel(network)}. A propriedade foi transferida para sua carteira conectada e registrada na rede.`

/** Data de liquidação (ou de criação, sem ela) como `29 Jul, 2026`. */
export function receiptDate(order: Pick<Order, 'settledAt' | 'createdAt'>): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date(order.settledAt ?? order.createdAt))
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? ''
  const month = get('month').replace('.', '')
  return `${get('day')} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${get('year')}`
}

export const transactionId = (order: Pick<Order, 'txHash'>): string =>
  order.txHash ? abbreviateAddress(order.txHash) : '—'

/** Textos próprios dos estados sem recibo (FR-35); o recibo nunca aparece para eles. */
export const ORDER_STATE_COPY = {
  pending: {
    title: 'Pedido aguardando confirmação',
    text: 'Seu pedido ainda não foi confirmado. O recibo aparece aqui assim que o pagamento for confirmado.',
  },
  rejected: {
    title: 'Pedido recusado',
    text: 'O pagamento deste pedido foi recusado e nenhum NFT foi transferido para sua carteira.',
  },
} as const
