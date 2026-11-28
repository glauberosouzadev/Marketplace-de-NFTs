import type { Collector, Wallet } from '@/contracts'
import {
  ENS_SUFFIX,
  WALLET_FORM_FIELDS,
  ensLabelOf,
  walletToFormValues,
  type WalletFormValues,
} from '@/features/wallets/validation'

export const NOTE_MAX_LENGTH = 500

export interface CollectorDefaults {
  values: WalletFormValues
  useOtherWallet: boolean
  note: string
}

/**
 * Valores iniciais do formulário. A carteira escolhida preenche tudo; só com "Usar outra carteira?"
 * (ou sem carteira) os campos que seguem no pedido vêm do contexto salvo. Rede, endereço, tipo e
 * apelido não fazem parte do `Collector` e voltam sempre da carteira.
 */
export function collectorDefaults(wallet: Wallet | null, collector: Collector): CollectorDefaults {
  const base = walletToFormValues(wallet)
  const useOtherWallet = collector.useOtherWallet === true
  const saved = useOtherWallet || !wallet
  const pick = (own: string | undefined, fallback: string): string =>
    saved && own ? own : fallback
  return {
    values: {
      ...base,
      displayName: pick(collector.displayName, base.displayName),
      profileName: pick(collector.profileName, base.profileName),
      email: pick(collector.email, base.email),
      ensName: pick(ensLabelOf(collector.ensName), base.ensName),
      secondaryRef: pick(collector.secondaryRef, base.secondaryRef),
      referralCode: pick(collector.referralCode, base.referralCode),
    },
    useOtherWallet,
    note: collector.note ?? '',
  }
}

/** Contexto do pedido: opcionais vazios ficam de fora (contrato com chaves exatas). */
export function toCollector(
  values: WalletFormValues,
  useOtherWallet: boolean,
  note: string,
): Collector {
  const ens = values.ensName.trim()
  const secondaryRef = values.secondaryRef.trim()
  const referralCode = values.referralCode.trim()
  const trimmedNote = note.trim()
  return {
    displayName: values.displayName.trim(),
    profileName: values.profileName.trim(),
    email: values.email.trim(),
    ...(ens && { ensName: `${ens}${ENS_SUFFIX}` }),
    ...(secondaryRef && { secondaryRef }),
    ...(useOtherWallet && { useOtherWallet }),
    ...(referralCode && { referralCode }),
    ...(trimmedNote && { note: trimmedNote }),
  }
}

/** Campos da carteira, travados até "Usar outra carteira?". */
export const WALLET_BOUND_FIELDS: ReadonlySet<keyof WalletFormValues> = new Set([
  'nickname',
  'network',
  'address',
  'provider',
  'secondaryRef',
  'ensName',
])

/** Primeiro campo inválido (ordem visual) que aceita foco; `undefined` se só restam travados. */
export function firstFocusableInvalid(
  invalid: ReadonlySet<string>,
  locked: boolean,
): keyof WalletFormValues | undefined {
  return WALLET_FORM_FIELDS.find(
    (field) => invalid.has(field) && !(locked && WALLET_BOUND_FIELDS.has(field)),
  )
}
