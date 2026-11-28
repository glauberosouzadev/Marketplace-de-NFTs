import type { Network, Wallet, WalletSlot } from '@/contracts'
import { NETWORK_OPTIONS } from '@/features/wallets/validation'

const SLOT_LABEL: Record<WalletSlot, string> = { primary: 'Principal', secondary: 'Reserva' }

export const slotLabel = (slot: WalletSlot): string => SLOT_LABEL[slot]

export const networkLabel = (network: Network): string =>
  NETWORK_OPTIONS.find((option) => option.value === network)?.label ?? network

/** `0xA91F…E82C`; endereços curtos ficam inteiros. */
export function abbreviateAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

/** ENS quando houver; senão o endereço abreviado. */
export const walletReference = (wallet: Wallet): string =>
  wallet.ensName ?? abbreviateAddress(wallet.address)

export const walletNetworkText = (wallet: Wallet): string =>
  wallet.slot === 'primary'
    ? `Rede principal ${networkLabel(wallet.network)}`
    : `Rede ${networkLabel(wallet.network)}`

/** Principal primeiro; a lista só tem carteiras cadastradas. */
export const walletList = (data: { primary: Wallet | null; secondary: Wallet | null }): Wallet[] =>
  [data.primary, data.secondary].filter((wallet): wallet is Wallet => wallet !== null)
