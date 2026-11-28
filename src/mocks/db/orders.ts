import type {
  Cart,
  Collector,
  CreateOrderRequest,
  FieldErrors,
  Network,
  Nft,
  Order,
  OrderSnapshot,
  OrderStatus,
  Quote,
  Wallet,
  WalletConnection,
} from '@/contracts'
import { buildQuote, sha256Hex } from './quote'
import { getDb, mutateDb, nextVersion } from './store'
import type { DbState } from './types'
import { EMAIL_PATTERN, isNetwork, REQUIRED_MESSAGE, text } from './wallets'

const REQUEST_IDS = ['quoteId', 'quoteFingerprint', 'walletId', 'connectionId'] as const
const REQUIRED_COLLECTOR = ['displayName', 'profileName'] as const
const OPTIONAL_COLLECTOR = ['ensName', 'secondaryRef', 'referralCode', 'note'] as const
/** Ordem fixa das chaves: o fingerprint não pode depender da ordem do JSON recebido. */
const COLLECTOR_KEYS = [
  ...REQUIRED_COLLECTOR,
  'email',
  ...OPTIONAL_COLLECTOR,
  'useOtherWallet',
] as const

export type OrderValidation =
  { ok: true; value: CreateOrderRequest } | { ok: false; fieldErrors: FieldErrors }

function validateCollector(raw: unknown, fieldErrors: FieldErrors): Collector {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  for (const field of REQUIRED_COLLECTOR) {
    if (text(body[field]) === '') fieldErrors[field] = REQUIRED_MESSAGE
  }
  const email = text(body.email)
  if (email === '') fieldErrors.email = REQUIRED_MESSAGE
  else if (!EMAIL_PATTERN.test(email)) fieldErrors.email = 'Digite um e-mail válido'

  const collector: Collector = {
    displayName: text(body.displayName),
    profileName: text(body.profileName),
    email,
  }
  for (const field of OPTIONAL_COLLECTOR) {
    const optional = text(body[field])
    if (optional !== '') collector[field] = optional
  }
  if (body.useOtherWallet === true) collector.useOtherWallet = true
  return collector
}

export function validateOrderRequest(body: Record<string, unknown>): OrderValidation {
  const fieldErrors: FieldErrors = {}
  for (const field of REQUEST_IDS) {
    if (text(body[field]) === '') fieldErrors[field] = REQUIRED_MESSAGE
  }
  const { network } = body
  if (!isNetwork(network)) fieldErrors.network = REQUIRED_MESSAGE
  const collector = validateCollector(body.collector, fieldErrors)

  if (Object.keys(fieldErrors).length > 0 || !isNetwork(network)) return { ok: false, fieldErrors }
  return {
    ok: true,
    value: {
      quoteId: text(body.quoteId),
      quoteFingerprint: text(body.quoteFingerprint),
      walletId: text(body.walletId),
      connectionId: text(body.connectionId),
      network,
      collector,
    },
  }
}

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

export type IdempotencyMatch =
  { kind: 'replay'; order: Order } | { kind: 'conflict' } | { kind: 'new' }

/** As três regras de idempotência (SDD-08), com a chave no escopo do usuário. */
export function matchIdempotency(
  orders: readonly Order[],
  userId: string,
  idempotencyKey: string,
  requestFingerprint: string,
): IdempotencyMatch {
  const known = orders.find((o) => o.userId === userId && o.idempotencyKey === idempotencyKey)
  if (!known) return { kind: 'new' }
  return known.requestFingerprint === requestFingerprint
    ? { kind: 'replay', order: structuredClone(known) }
    : { kind: 'conflict' }
}

export type CreateOrderResult =
  | { kind: 'created'; order: Order }
  | Exclude<IdempotencyMatch, { kind: 'new' }>
  | { kind: 'invalid'; fieldErrors: FieldErrors }
  | { kind: 'disconnected' }
  | { kind: 'stale'; quote: Quote }

export interface CreateOrderInput {
  userId: string
  idempotencyKey: string
  request: CreateOrderRequest
  now?: number
}

function snapshotOf(
  quote: Quote,
  wallet: Wallet,
  connection: WalletConnection,
  collector: Collector,
): OrderSnapshot {
  const couponCode = quote.coupon?.status === 'applied' ? quote.coupon.code : undefined
  return {
    lines: quote.lines,
    subtotal: quote.subtotal,
    discount: quote.discount,
    ...(couponCode ? { couponCode } : {}),
    networkFee: quote.networkFee,
    total: quote.total,
    network: quote.network,
    wallet: { label: wallet.nickname, address: wallet.address, provider: connection.provider },
    collector,
  }
}

type Preconditions =
  | { ok: true; wallet: Wallet; connection: WalletConnection; cart: Cart }
  | { ok: false; result: CreateOrderResult }

function checkPreconditions(
  db: DbState,
  userId: string,
  request: CreateOrderRequest,
): Preconditions {
  const wallet = db.wallets.find((w) => w.id === request.walletId && w.userId === userId)
  if (!wallet) {
    return {
      ok: false,
      result: { kind: 'invalid', fieldErrors: { walletId: 'Carteira não encontrada' } },
    }
  }
  const connection = db.walletConnections.find(
    (c) =>
      c.id === request.connectionId &&
      c.walletId === wallet.id &&
      c.network === request.network &&
      c.status === 'connected',
  )
  if (!connection) return { ok: false, result: { kind: 'disconnected' } }
  const cart = db.carts.find((c) => c.owner === `user:${userId}`)
  if (!cart || cart.items.length === 0) {
    return { ok: false, result: { kind: 'invalid', fieldErrors: { cart: 'Carrinho vazio' } } }
  }
  return { ok: true, wallet, connection, cart }
}

export async function createOrder({
  userId,
  idempotencyKey,
  request,
  now = Date.now(),
}: CreateOrderInput): Promise<CreateOrderResult> {
  const requestFingerprint = await requestFingerprintOf(request)
  const db = getDb()
  const prior = matchIdempotency(db.orders, userId, idempotencyKey, requestFingerprint)
  if (prior.kind !== 'new') return prior
  const checked = checkPreconditions(db, userId, request)
  if (!checked.ok) return checked.result

  const quote = await buildQuote(db, checked.cart, request.network, now)
  if (quote.fingerprint !== request.quoteFingerprint || quote.issues.length > 0) {
    return { kind: 'stale', quote }
  }

  // Revalida dentro da mutação síncrona: outro envio ou uma desconexão pode ter ocorrido no `await`.
  return mutateDb((draft): CreateOrderResult => {
    const raced = matchIdempotency(draft.orders, userId, idempotencyKey, requestFingerprint)
    if (raced.kind !== 'new') return raced
    const current = checkPreconditions(draft, userId, request)
    if (!current.ok) return current.result
    const order: Order = {
      id: `order-${crypto.randomUUID()}`,
      userId,
      status: 'pending',
      version: 1,
      idempotencyKey,
      requestFingerprint,
      snapshot: snapshotOf(quote, current.wallet, current.connection, request.collector),
      createdAt: new Date(now).toISOString(),
    }
    draft.orders.push(order)
    return { kind: 'created', order: structuredClone(order) }
  })
}

export function findUserOrder(userId: string, orderId: string): Order | undefined {
  const order = getDb().orders.find((o) => o.id === orderId && o.userId === userId)
  return order ? structuredClone(order) : undefined
}

export type SettlementStatus = Exclude<OrderStatus, 'pending'>

export interface Settlement {
  order: Order
  /** NFTs com disponibilidade decrementada pela confirmação. */
  nfts: Nft[]
}

export const REJECT_REASON = 'Pagamento recusado pela simulação'

const simulatedTxHash = (): string =>
  `0x${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')

/** Domínio `.invalid`: o link nunca aponta para um explorador real (Q-22). */
export const explorerUrlOf = (network: Network, txHash: string): string =>
  `https://explorer.kurio.invalid/${network}/tx/${txHash}`

function decrementAvailability(db: DbState, order: Order): Nft[] {
  const touched = new Map<string, Nft>()
  for (const line of order.snapshot.lines) {
    const nft = db.nfts.find((n) => n.id === line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition) continue
    edition.available = Math.max(0, edition.available - line.quantity)
    edition.soldOut = edition.available === 0
    touched.set(nft.id, nft)
  }
  touched.forEach((nft) => {
    nft.version = nextVersion(nft.version)
  })
  return [...touched.values()]
}

/** Baixa só as linhas e quantidades compradas (RN-10); itens adicionados depois permanecem. */
function removePurchased(db: DbState, order: Order): void {
  const cart = db.carts.find((c) => c.owner === `user:${order.userId}`)
  if (!cart) return
  const lineKey = (line: { nftId: string; editionId: string }) => `${line.nftId}/${line.editionId}`
  const purchased = new Map(order.snapshot.lines.map((line) => [lineKey(line), line.quantity]))
  if (!cart.items.some((item) => purchased.has(lineKey(item)))) return
  cart.items = cart.items
    .map((item) => ({ ...item, quantity: item.quantity - (purchased.get(lineKey(item)) ?? 0) }))
    .filter((item) => item.quantity > 0)
  cart.version = nextVersion(cart.version)
}

/** Liquidação simulada; `null` se o pedido não existe ou já é terminal (nada muda). */
export function settleOrder(
  orderId: string,
  status: SettlementStatus,
  now = Date.now(),
): Settlement | null {
  return mutateDb((db): Settlement | null => {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'pending') return null
    order.status = status
    order.version = nextVersion(order.version)
    order.settledAt = new Date(now).toISOString()
    if (status === 'rejected') {
      order.rejectReason = REJECT_REASON
      return { order: structuredClone(order), nfts: [] }
    }
    order.txHash = simulatedTxHash()
    order.explorerUrl = explorerUrlOf(order.snapshot.network, order.txHash)
    const nfts = decrementAvailability(db, order)
    removePurchased(db, order)
    return { order: structuredClone(order), nfts: structuredClone(nfts) }
  })
}
