/** Entidades do domínio (SDD-05). Valores ETH são `string` decimal. */

export type EthString = string
export type IsoDate = string

export type Network = 'ethereum' | 'polygon' | 'solana'
export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
export type WalletSlot = 'primary' | 'secondary'
export type NftTag = 'new' | 'trending'

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  ensName: string
  avatarUrl?: string
  version: number
}

export interface Session {
  token: string
  userId: string
  expiresAt: IsoDate
}

export interface NftImage {
  url: string
  alt: string
}

export interface NftAttribute {
  traitType: string
  value: string
}

export interface Edition {
  id: string
  nftId: string
  label: string
  price: EthString
  available: number
  soldOut: boolean
}

export interface Nft {
  id: string
  name: string
  description: string
  collection: { id: string; name: string }
  network: Network
  tokenId: string
  images: NftImage[]
  attributes: NftAttribute[]
  rating: { score: number; count: number }
  badges: string[]
  tags: NftTag[]
  listedAt: IsoDate
  priceFrom: EthString
  previousPrice?: EthString
  editions: Edition[]
  version: number
}

/** Versão de listagem: sem `editions`. */
export type NftSummary = Omit<Nft, 'editions'>

export interface CartItem {
  nftId: string
  editionId: string
  quantity: number
  name: string
  image: NftImage
  unitPrice: EthString
  available: number
}

export interface Cart {
  id: string
  owner: `guest:${string}` | `user:${string}`
  items: CartItem[]
  couponCode?: string
  version: number
}

export type QuoteIssueType = 'PRICE_CHANGED' | 'SOLD_OUT' | 'QUANTITY_EXCEEDS' | 'COUPON_EXPIRED'

export interface QuoteIssue {
  type: QuoteIssueType
  nftId?: string
  editionId?: string
  previous?: EthString
  current?: EthString
}

export interface QuoteLine {
  nftId: string
  editionId: string
  unitPrice: EthString
  quantity: number
  lineTotal: EthString
  available: number
  issue?: QuoteIssue
}

export interface QuoteCoupon {
  code: string
  status: 'applied' | 'invalid' | 'expired'
}

export interface Quote {
  id: string
  cartVersion: number
  fingerprint: string
  network: Network
  lines: QuoteLine[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  coupon?: QuoteCoupon
  issues: QuoteIssue[]
}

/** Dados do colecionador (Q-10). */
export interface Collector {
  displayName: string
  profileName: string
  email: string
  ensName?: string
  /** ENS ou carteira secundária (opcional). */
  secondaryRef?: string
  /** "Usar outra carteira?": edição pontual no pedido, sem alterar o cadastro. */
  useOtherWallet?: boolean
  referralCode?: string
  note?: string
}

export interface OrderSnapshot {
  lines: QuoteLine[]
  subtotal: EthString
  discount: EthString
  couponCode?: string
  networkFee: EthString
  total: EthString
  network: Network
  wallet: { label: string; address: string; provider: WalletProvider }
  collector: Collector
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  version: number
  idempotencyKey: string
  /** Hash hex calculado pelos mocks. */
  requestFingerprint: string
  snapshot: OrderSnapshot
  txHash?: string
  explorerUrl?: string
  rejectReason?: string
  createdAt: IsoDate
  settledAt?: IsoDate
}

export interface Wallet {
  id: string
  userId: string
  slot: WalletSlot
  nickname: string
  provider: WalletProvider
  network: Network
  address: string
  ensName?: string
  displayName: string
  profileName: string
  email: string
  referralCode?: string
  secondaryRef?: string
}

export type WalletConnectionStatus = 'connected' | 'rejected' | 'disconnected'

export interface WalletConnection {
  id: string
  walletId: string
  provider: WalletProvider
  network: Network
  status: WalletConnectionStatus
}

export interface Favorite {
  userId: string
  nftId: string
  createdAt: IsoDate
}

export interface Profile {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl?: string
}
