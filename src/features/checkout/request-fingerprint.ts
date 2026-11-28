import type { Collector, CreateOrderRequest } from '@/contracts'

/** Ordem fixa, igual à do mock (`requestFingerprintOf`): o hash não depende da ordem do JSON. */
const COLLECTOR_KEYS = [
  'displayName',
  'profileName',
  'email',
  'ensName',
  'secondaryRef',
  'referralCode',
  'note',
  'useOtherWallet',
] as const satisfies ReadonlyArray<keyof Collector>

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Mesmo hash do mock (quoteId, carteira, conexão, rede, dados), usado só para vincular a chave
 * ao conteúdo da tentativa; quem decide replay ou 409 é o servidor.
 */
export function requestFingerprintOf(request: CreateOrderRequest): Promise<string> {
  const { quoteId, walletId, connectionId, network, collector } = request
  return sha256Hex(
    JSON.stringify({
      quoteId,
      walletId,
      connectionId,
      network,
      collector: COLLECTOR_KEYS.map((key) => collector[key] ?? null),
    }),
  )
}
