import { COLLECTIONS } from '../fixtures/collections'
import { COUPONS } from '../fixtures/coupons'
import { buildNfts } from '../fixtures/nfts'
import { USERS, WALLETS, WALLET_CONNECTIONS } from '../fixtures/users'
import { SCHEMA_VERSION, type DbState } from './types'

/** Seed determinístico: duas chamadas devolvem dados idênticos e independentes (cópias novas). */
export function buildSeed(): DbState {
  return {
    users: USERS.map((u) => ({ ...u })),
    collections: COLLECTIONS.map((c) => ({ ...c })),
    nfts: buildNfts(),
    wallets: WALLETS.map((w) => ({ ...w })),
    walletConnections: WALLET_CONNECTIONS.map((c) => ({ ...c })),
    coupons: COUPONS.map((c) => ({ ...c })),
    sessions: [],
    carts: [],
    orders: [],
    favorites: [],
    meta: { schemaVersion: SCHEMA_VERSION, eventSeq: 0, scenario: 'default' },
  }
}
