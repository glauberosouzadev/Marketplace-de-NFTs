import type { Order, OrderStatus } from '@/contracts/entities'
import type { KurioEvent } from '@/contracts/events'

/** Teto de ids lembrados por sessão; acima disso o mais antigo sai (FIFO). */
export const SEEN_IDS_LIMIT = 500

export type RejectReason = 'audience' | 'duplicate' | 'stale' | 'terminal'

export type AcceptResult = { apply: true } | { apply: false; reason: RejectReason }

export interface ResourceRef {
  type: KurioEvent['resource']['type']
  id: string
}

export interface Reconciler {
  accept(event: KurioEvent): AcceptResult
  observeVersion(resource: ResourceRef, version: number): void
  /** Resposta REST de pedido: além da versão, um status terminal passa a bloquear regressão. */
  observeOrder(order: Pick<Order, 'id' | 'version' | 'status'>): void
  reset(): void
}

interface ReconcilerOptions {
  currentUserId: string | null
  seenIdsLimit?: number
}

const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set(['confirmed', 'rejected'])

const keyOf = (resource: ResourceRef): string => `${resource.type}:${resource.id}`

export function createReconciler({
  currentUserId,
  seenIdsLimit = SEEN_IDS_LIMIT,
}: ReconcilerOptions): Reconciler {
  const seenIds = new Set<string>()
  const versions = new Map<string, number>()
  const terminalOrders = new Map<string, OrderStatus>()

  function rememberId(id: string): void {
    seenIds.add(id)
    if (seenIds.size > seenIdsLimit) {
      const oldest = seenIds.values().next().value
      if (oldest !== undefined) seenIds.delete(oldest)
    }
  }

  function observeVersion(resource: ResourceRef, version: number): void {
    const key = keyOf(resource)
    if (version > (versions.get(key) ?? -Infinity)) versions.set(key, version)
  }

  function rememberStatus(resource: ResourceRef, status: OrderStatus): void {
    if (TERMINAL_STATUSES.has(status)) terminalOrders.set(keyOf(resource), status)
  }

  function observeOrder({ id, version, status }: Pick<Order, 'id' | 'version' | 'status'>): void {
    const resource: ResourceRef = { type: 'order', id }
    observeVersion(resource, version)
    rememberStatus(resource, status)
  }

  function isForCurrentAudience(event: KurioEvent): boolean {
    return (
      event.audience === 'public' ||
      (currentUserId !== null && event.audience === `user:${currentUserId}`)
    )
  }

  function leavesTerminal(event: KurioEvent): boolean {
    if (event.type !== 'order.updated') return false
    const known = terminalOrders.get(keyOf(event.resource))
    return known !== undefined && known !== event.data.status
  }

  function accept(event: KurioEvent): AcceptResult {
    if (!isForCurrentAudience(event)) return { apply: false, reason: 'audience' }
    if (seenIds.has(event.id)) return { apply: false, reason: 'duplicate' }
    const known = versions.get(keyOf(event.resource))
    if (known !== undefined && event.version <= known) return { apply: false, reason: 'stale' }
    if (leavesTerminal(event)) return { apply: false, reason: 'terminal' }

    rememberId(event.id)
    observeVersion(event.resource, event.version)
    if (event.type === 'order.updated') rememberStatus(event.resource, event.data.status)
    return { apply: true }
  }

  function reset(): void {
    seenIds.clear()
    versions.clear()
    terminalOrders.clear()
  }

  return { accept, observeVersion, observeOrder, reset }
}
