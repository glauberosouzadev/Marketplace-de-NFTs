import type { FacetsQuery, ListNftsQuery } from '@/contracts'

/** Escopo de dados do carrinho/cotação: visitante (cartId) ou usuário (uid). */
export type Scope = readonly ['guest', string] | readonly ['user', string]

export const queryKeys = {
  session: () => ['session'] as const,
  nfts: (params: ListNftsQuery) => ['public', 'nfts', params] as const,
  featured: () => ['public', 'featured'] as const,
  // Fora de ['public','nfts']: setQueriesData por prefixo não entrega Facets a updater de NftPage.
  facets: (params: FacetsQuery) => ['public', 'facets', params] as const,
  nft: (id: string) => ['public', 'nft', id] as const,
  favorites: (uid: string) => ['user', uid, 'favorites'] as const,
  cart: (scope: Scope) => [...scope, 'cart'] as const,
  quote: (scope: Scope, cartVersion: number, coupon: string | null, network: string) =>
    [...scope, 'quote', cartVersion, coupon, network] as const,
  order: (uid: string, id: string) => ['user', uid, 'order', id] as const,
  profile: (uid: string) => ['user', uid, 'profile'] as const,
  wallets: (uid: string) => ['user', uid, 'wallets'] as const,
}
