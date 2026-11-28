import { z } from 'zod'
import type { Network, UpsertWalletRequest, Wallet, WalletProvider } from '@/contracts'

/** Q-29: formato por rede; Solana com validação simples de base58 (32–44 caracteres). */
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const ENS_SUFFIX = '.eth'

export const REQUIRED_MESSAGE = 'Campo obrigatório'
export const INVALID_ADDRESS_MESSAGE = 'Endereço inválido para a rede selecionada'

export const NETWORK_OPTIONS: readonly { value: Network; label: string }[] = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
]

export const PROVIDER_OPTIONS: readonly { value: WalletProvider; label: string }[] = [
  { value: 'metamask', label: 'MetaMask' },
  { value: 'walletconnect', label: 'WalletConnect' },
  { value: 'coinbase', label: 'Coinbase Wallet' },
]

export const isNetwork = (value: string): value is Network =>
  NETWORK_OPTIONS.some((option) => option.value === value)

export const isWalletProvider = (value: string): value is WalletProvider =>
  PROVIDER_OPTIONS.some((option) => option.value === value)

export function isValidWalletAddress(network: Network, address: string): boolean {
  return (network === 'solana' ? SOLANA_ADDRESS : EVM_ADDRESS).test(address)
}

const required = z.string().trim().min(1, REQUIRED_MESSAGE)

/** `ensName` guarda só o nome antes de `.eth`; a API recebe o nome completo. Rede e tipo ficam `string` ('' = nada selecionado) e são estreitados em `toUpsertRequest`. */
export const walletFormSchema = z
  .object({
    displayName: required,
    nickname: required,
    network: required,
    address: required,
    provider: required,
    email: required.pipe(z.email('Digite um e-mail válido')),
    profileName: required,
    secondaryRef: z.string().trim(),
    referralCode: z.string().trim(),
    ensName: required,
  })
  .superRefine(({ network, address }, ctx) => {
    if (address && isNetwork(network) && !isValidWalletAddress(network, address)) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: INVALID_ADDRESS_MESSAGE })
    }
  })

export type WalletFormValues = z.input<typeof walletFormSchema>

/** Campos do formulário, na ordem visual (linha a linha), usada para o foco em erros da API. */
export const WALLET_FORM_FIELDS = [
  'displayName',
  'nickname',
  'network',
  'profileName',
  'address',
  'secondaryRef',
  'provider',
  'referralCode',
  'email',
  'ensName',
] as const satisfies readonly (keyof WalletFormValues)[]

export const EMPTY_WALLET_VALUES: WalletFormValues = {
  displayName: '',
  nickname: '',
  network: '',
  address: '',
  provider: '',
  email: '',
  profileName: '',
  secondaryRef: '',
  referralCode: '',
  ensName: '',
}

/** Nome antes de `.eth`, como o formulário o edita. */
export const ensLabelOf = (ensName = ''): string =>
  ensName.endsWith(ENS_SUFFIX) ? ensName.slice(0, -ENS_SUFFIX.length) : ensName

export function walletToFormValues(wallet: Wallet | null): WalletFormValues {
  if (!wallet) return EMPTY_WALLET_VALUES
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    address: wallet.address,
    provider: wallet.provider,
    email: wallet.email,
    profileName: wallet.profileName,
    secondaryRef: wallet.secondaryRef ?? '',
    referralCode: wallet.referralCode ?? '',
    ensName: ensLabelOf(wallet.ensName),
  }
}

/** `values` já passou por `walletFormSchema`; devolve `null` se rede ou tipo não forem válidos. */
export function toUpsertRequest(values: WalletFormValues): UpsertWalletRequest | null {
  const { network, provider, ensName, secondaryRef, referralCode, ...rest } = values
  if (!isNetwork(network) || !isWalletProvider(provider)) return null
  return {
    ...rest,
    network,
    provider,
    ensName: `${ensName.trim()}${ENS_SUFFIX}`,
    ...(secondaryRef.trim() && { secondaryRef: secondaryRef.trim() }),
    ...(referralCode.trim() && { referralCode: referralCode.trim() }),
  }
}
