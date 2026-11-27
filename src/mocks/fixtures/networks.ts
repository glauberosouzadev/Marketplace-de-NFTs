import type { EthString, Network } from '@/contracts'

export const DEFAULT_NETWORK: Network = 'ethereum'

/** Taxa fixa por rede, por cotação (não por linha); carrinho vazio não paga taxa. Valores do mock. */
export const NETWORK_FEES: Readonly<Record<Network, EthString>> = {
  ethereum: '0.0025',
  polygon: '0.0001',
  solana: '0.00005',
}
