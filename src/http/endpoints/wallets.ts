import { request } from '@/http/client'
import type {
  CreateWalletConnectionRequest,
  UpsertWalletRequest,
  Wallet,
  WalletConnectionResponse,
  WalletSlot,
  WalletsResponse,
} from '@/contracts'

export function getWallets(signal: AbortSignal): Promise<WalletsResponse> {
  return request<WalletsResponse>({ method: 'GET', url: '/me/wallets', signal })
}

export function upsertWallet(slot: WalletSlot, body: UpsertWalletRequest): Promise<Wallet> {
  return request<Wallet>({
    method: 'PUT',
    url: `/me/wallets/${encodeURIComponent(slot)}`,
    data: body,
  })
}

export function createWalletConnection(
  body: CreateWalletConnectionRequest,
): Promise<WalletConnectionResponse> {
  return request<WalletConnectionResponse>({
    method: 'POST',
    url: '/wallet-connections',
    data: body,
  })
}

export function deleteWalletConnection(id: string): Promise<void> {
  return request<void>({ method: 'DELETE', url: `/wallet-connections/${encodeURIComponent(id)}` })
}
