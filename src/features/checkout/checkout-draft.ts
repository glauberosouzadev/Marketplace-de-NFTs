import { z } from 'zod'
import type { Collector, CreateOrderRequest, Network, WalletProvider } from '@/contracts'
import { clearCheckoutDraft, getCheckoutDraft, setCheckoutDraft } from '@/lib/storage'
import {
  initialCheckoutState,
  resumeCheckout,
  type CheckoutMachineState,
  type CheckoutStatus,
} from './checkout-machine'

/** Dados não sensíveis preenchidos no pagamento (0046). Nunca senha ou token. */
export interface CheckoutFields {
  walletId: string | null
  provider: WalletProvider | null
  network: Network | null
  connectionId?: string | undefined
  collector: Collector
}

export type CheckoutDraft = CheckoutMachineState & CheckoutFields

const DRAFT_VERSION = 1

const STATUSES = [
  'editing',
  'reviewing',
  'revalidating',
  'stale',
  'submitting',
  'verifying',
  'pending',
  'confirmed',
  'rejected',
] as const satisfies readonly CheckoutStatus[]

const optionalText = z.string().exactOptional()

const collectorSchema = z.object({
  displayName: z.string(),
  profileName: z.string(),
  email: z.string(),
  ensName: optionalText,
  secondaryRef: optionalText,
  useOtherWallet: z.boolean().exactOptional(),
  referralCode: optionalText,
  note: optionalText,
})

// `z.object` descarta chaves desconhecidas: nada além do contrato volta do armazenamento.
const storedSchema = z.object({
  v: z.literal(DRAFT_VERSION),
  uid: z.string(),
  status: z.enum(STATUSES),
  quoteId: optionalText,
  quoteFingerprint: optionalText,
  idempotencyKey: optionalText,
  requestFingerprint: optionalText,
  orderId: optionalText,
  walletId: z.string().nullable(),
  provider: z.enum(['metamask', 'walletconnect', 'coinbase']).nullable(),
  network: z.enum(['ethereum', 'polygon', 'solana']).nullable(),
  connectionId: optionalText,
  collector: collectorSchema,
})

export const emptyCheckoutDraft = (): CheckoutDraft => ({
  ...initialCheckoutState,
  walletId: null,
  provider: null,
  network: null,
  collector: { displayName: '', profileName: '', email: '' },
})

export const serializeCheckoutDraft = (uid: string, draft: CheckoutDraft): string =>
  JSON.stringify({ v: DRAFT_VERSION, uid, ...draft })

/** `null` se ausente, corrompido ou de outro usuário (SDD-07). */
export function parseCheckoutDraft(raw: string | null, uid: string): CheckoutDraft | null {
  if (raw === null) return null
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = storedSchema.safeParse(json)
  if (!parsed.success) return null
  const { v, uid: owner, ...draft } = parsed.data
  return v === DRAFT_VERSION && owner === uid ? draft : null
}

/** Restaura o contexto do usuário; o que não for dele (ou for inválido) é descartado. */
export function loadCheckoutDraft(uid: string): CheckoutDraft {
  const raw = getCheckoutDraft(uid)
  const draft = parseCheckoutDraft(raw, uid)
  if (!draft) {
    if (raw !== null) clearCheckoutDraft(uid)
    return emptyCheckoutDraft()
  }
  return resumeCheckout(draft)
}

export function saveCheckoutDraft(uid: string, draft: CheckoutDraft): void {
  setCheckoutDraft(uid, serializeCheckoutDraft(uid, draft))
}

export const discardCheckoutDraft = (uid: string): void => clearCheckoutDraft(uid)

/** Corpo do `POST /orders`; `null` enquanto faltar cotação, carteira, conexão ou rede. */
export function orderRequestOf(draft: CheckoutDraft): CreateOrderRequest | null {
  const { quoteId, quoteFingerprint, walletId, connectionId, network, collector } = draft
  if (!quoteId || !quoteFingerprint || !walletId || !connectionId || !network) return null
  return { quoteId, quoteFingerprint, walletId, connectionId, network, collector }
}
