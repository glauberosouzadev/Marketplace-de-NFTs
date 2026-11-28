import type {
  FieldErrors,
  Network,
  UpsertWalletRequest,
  Wallet,
  WalletConnection,
  WalletProvider,
  WalletSlot,
} from '@/contracts'
import { mutateDb } from './store'

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PROVIDERS: readonly WalletProvider[] = ['metamask', 'walletconnect', 'coinbase']
const NETWORKS: readonly Network[] = ['ethereum', 'polygon', 'solana']
const REQUIRED_TEXT = ['displayName', 'nickname', 'profileName', 'ensName'] as const
const OPTIONAL_TEXT = ['secondaryRef', 'referralCode'] as const

export const REQUIRED_MESSAGE = 'Campo obrigatório'
const INVALID_ENS_MESSAGE = 'Nome ENS deve terminar em .eth'

export const isWalletSlot = (value: string): value is WalletSlot =>
  value === 'primary' || value === 'secondary'

export const isNetwork = (value: unknown): value is Network =>
  NETWORKS.some((network) => network === value)

export const isWalletProvider = (value: unknown): value is WalletProvider =>
  PROVIDERS.some((provider) => provider === value)

export function isValidAddress(network: Network, address: string): boolean {
  return (network === 'solana' ? SOLANA_ADDRESS : EVM_ADDRESS).test(address)
}

export const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export type UpsertValidation =
  { ok: true; value: UpsertWalletRequest } | { ok: false; fieldErrors: FieldErrors }

export function validateUpsert(body: Record<string, unknown>): UpsertValidation {
  const fieldErrors: FieldErrors = {}
  for (const field of REQUIRED_TEXT) {
    if (text(body[field]) === '') fieldErrors[field] = REQUIRED_MESSAGE
  }
  const ensName = text(body.ensName)
  if (ensName !== '' && !ensName.endsWith('.eth')) fieldErrors.ensName = INVALID_ENS_MESSAGE
  const email = text(body.email)
  if (email === '') fieldErrors.email = REQUIRED_MESSAGE
  else if (!EMAIL_PATTERN.test(email)) fieldErrors.email = 'Digite um e-mail válido'

  const { provider, network } = body
  if (!isWalletProvider(provider)) fieldErrors.provider = REQUIRED_MESSAGE
  if (!isNetwork(network)) fieldErrors.network = REQUIRED_MESSAGE

  const address = text(body.address)
  if (address === '') fieldErrors.address = REQUIRED_MESSAGE
  else if (isNetwork(network) && !isValidAddress(network, address)) {
    fieldErrors.address = 'Endereço inválido para a rede selecionada'
  }

  if (Object.keys(fieldErrors).length > 0 || !isWalletProvider(provider) || !isNetwork(network)) {
    return { ok: false, fieldErrors }
  }
  const value: UpsertWalletRequest = {
    displayName: text(body.displayName),
    nickname: text(body.nickname),
    profileName: text(body.profileName),
    email,
    provider,
    network,
    address,
    ensName: ensName,
  }
  for (const field of OPTIONAL_TEXT) {
    const optional = text(body[field])
    if (optional !== '') value[field] = optional
  }
  return { ok: true, value }
}

function nextId(prefix: string, existing: readonly { id: string }[]): string {
  const last = Math.max(0, ...existing.map((item) => Number(item.id.slice(prefix.length + 1))))
  return `${prefix}-${String(last + 1).padStart(3, '0')}`
}

/** Um registro por usuário e slot: regrava os campos mantendo o id. */
export function upsertWallet(userId: string, slot: WalletSlot, input: UpsertWalletRequest): Wallet {
  return mutateDb((db) => {
    const current = db.wallets.find((w) => w.userId === userId && w.slot === slot)
    const wallet: Wallet = {
      ...input,
      id: current?.id ?? nextId('wallet', db.wallets),
      userId,
      slot,
    }
    if (current) db.wallets[db.wallets.indexOf(current)] = wallet
    else db.wallets.push(wallet)
    return structuredClone(wallet)
  })
}

export function rejectNextConnection(): void {
  mutateDb((db) => {
    db.meta.rejectNextConnection = true
  })
}

/** Uma conexão por carteira: reconectar regrava a existente. */
export function connectWallet(
  wallet: Wallet,
  provider: WalletProvider,
  network: Network,
): WalletConnection {
  return mutateDb((db) => {
    const status = db.meta.rejectNextConnection ? 'rejected' : 'connected'
    db.meta.rejectNextConnection = false
    const current = db.walletConnections.find((c) => c.walletId === wallet.id)
    const connection: WalletConnection = {
      id: current?.id ?? nextId('conn', db.walletConnections),
      walletId: wallet.id,
      provider,
      network,
      status,
    }
    if (current) db.walletConnections[db.walletConnections.indexOf(current)] = connection
    else db.walletConnections.push(connection)
    return structuredClone(connection)
  })
}

export function disconnectConnection(connectionId: string): boolean {
  return mutateDb((db) => {
    const connection = db.walletConnections.find((c) => c.id === connectionId)
    if (connection) connection.status = 'disconnected'
    return connection !== undefined
  })
}
