import type {
  Cart,
  Favorite,
  Nft,
  Order,
  Session,
  User,
  Wallet,
  WalletConnection,
} from '@/contracts'

/** Usuário do mock: guarda só hash + salt da senha (RN-15). */
export interface MockUser extends User {
  passwordHash: string
  salt: string
}

export interface MockCollection {
  id: string
  name: string
}

/** Cupom: inválido = inativo ou código inexistente; expirado = `expiresAt` no passado. */
export interface MockCoupon {
  code: string
  discountBps: number
  expiresAt: string
  active: boolean
}

export const SCHEMA_VERSION = 1

export interface MockMeta {
  /** Contador monotônico para ids de evento. */
  eventSeq: number
  schemaVersion: number
  scenario: string
  /** A próxima conexão de carteira será recusada (uma única vez). */
  rejectNextConnection: boolean
}

export interface DbState {
  users: MockUser[]
  collections: MockCollection[]
  nfts: Nft[]
  wallets: Wallet[]
  walletConnections: WalletConnection[]
  coupons: MockCoupon[]
  sessions: Session[]
  carts: Cart[]
  orders: Order[]
  favorites: Favorite[]
  meta: MockMeta
}

export type DbSlice = keyof DbState
