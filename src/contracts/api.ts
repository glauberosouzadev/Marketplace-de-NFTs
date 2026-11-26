import type {
  Cart,
  EthString,
  Collector,
  Favorite,
  IsoDate,
  Network,
  Nft,
  NftSummary,
  Order,
  Profile,
  Quote,
  User,
  Wallet,
  WalletConnection,
  WalletProvider,
  WalletSlot,
} from './entities'

/** Tipos de request/response de todos os endpoints (TSD-03). Só tipos. */

// Auth
export interface RegisterRequest {
  username: string
  email: string
  password: string
  guestCartId?: string
}
export interface LoginRequest {
  email: string
  password: string
  guestCartId?: string
}
export interface CartAdjustment {
  nftId: string
  editionId: string
  reason: 'SOLD_OUT' | 'QUANTITY_REDUCED' | 'REMOVED'
  previousQuantity?: number
  currentQuantity?: number
}
export interface AuthResponse {
  session: { token: string; expiresAt: IsoDate }
  user: User
  cartAdjustments: CartAdjustment[]
}
export interface SessionResponse {
  user: User
  expiresAt: IsoDate
}

// Catálogo
export type NftTab = 'all' | 'new' | 'trending'
export type NftSort = 'recent' | 'price_asc' | 'price_desc'

export interface NftFilters {
  q?: string
  collection?: string[]
  network?: Network[]
  priceMin?: EthString
  priceMax?: EthString
  tab?: NftTab
}
export interface ListNftsQuery extends NftFilters {
  sort?: NftSort
  page?: number
  pageSize?: number
}
export interface ListNftsResponse {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
export type FacetsQuery = NftFilters
export interface FacetsResponse {
  collections: Array<{ id: string; name: string; count: number }>
  networks: Array<{ id: Network; count: number }>
  price: { min: EthString; max: EthString }
}
export interface FeaturedResponse {
  items: NftSummary[]
}
export type GetNftResponse = Nft

// Favoritos
export interface ListFavoritesResponse {
  items: Array<Pick<Favorite, 'nftId' | 'createdAt'> & { nft: NftSummary }>
}

// Carrinho
export type CartResponse = Cart
export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}
export interface UpdateCartItemRequest {
  quantity: number
}
export interface CouponRequest {
  code: string
}

// Cotação
export interface QuoteRequest {
  network?: Network
}
export type QuoteResponse = Quote

// Carteiras
export interface WalletsResponse {
  primary: Wallet | null
  secondary: Wallet | null
}
export interface UpsertWalletRequest {
  displayName: string
  nickname: string
  profileName: string
  email: string
  provider: WalletProvider
  network: Network
  address: string
  ensName: string
  secondaryRef?: string
  referralCode?: string
}
export interface UpsertWalletParams {
  slot: WalletSlot
}
export interface CreateWalletConnectionRequest {
  walletId: string
  provider: WalletProvider
  network: Network
}
export type WalletConnectionResponse = WalletConnection

// Pedidos
export interface CreateOrderRequest {
  quoteId: string
  quoteFingerprint: string
  walletId: string
  connectionId: string
  network: Network
  collector: Collector
}
/** Header obrigatório em `POST /orders`. */
export interface CreateOrderHeaders {
  'Idempotency-Key': string
}
export type OrderResponse = Order

// Perfil
export type ProfileResponse = Profile
export interface UpdateProfileRequest {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}
/** Corpo multipart de `PUT /me/avatar`: PNG/JPEG/WebP, até 2 MB (Q-28). */
export interface UploadAvatarRequest {
  file: File | Blob
}
export interface AvatarResponse {
  avatarUrl: string
}
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
