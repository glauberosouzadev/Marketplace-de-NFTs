import type { Scope } from '@/app/query-keys'
import type { KurioEvent, Nft, Order } from '@/contracts'
import { applyEvent, type ApplyEventDeps } from './apply-event'
import { createReconciler, type Reconciler } from './reconciler'

/** O que as leituras REST informam ao reconciliador (versão e, no pedido, status terminal). */
export interface RestObserver {
  observeNft(nft: Pick<Nft, 'id' | 'version'>): void
  observeOrder(order: Pick<Order, 'id' | 'version' | 'status'>): void
}

export interface RealtimeSync extends RestObserver {
  handle(event: KurioEvent): void
  reset(): void
}

export interface RealtimeSyncDeps extends Omit<ApplyEventDeps, 'scope'> {
  getScope: () => Scope
}

/**
 * Único caminho de evento para o cache. O reconciliador é recriado quando o usuário do escopo
 * muda, então a audiência e o dedupe nunca atravessam sessões.
 */
export function createRealtimeSync({ getScope, ...deps }: RealtimeSyncDeps): RealtimeSync {
  let uid: string | null = null
  let reconciler: Reconciler = createReconciler({ currentUserId: null })

  function current(): { reconciler: Reconciler; scope: Scope } {
    const scope = getScope()
    const scopeUid = scope[0] === 'user' ? scope[1] : null
    if (scopeUid !== uid) {
      uid = scopeUid
      reconciler = createReconciler({ currentUserId: uid })
    }
    return { reconciler, scope }
  }

  return {
    handle(event) {
      const { reconciler, scope } = current()
      if (reconciler.accept(event).apply) applyEvent(event, { ...deps, scope })
    },
    observeNft: ({ id, version }) =>
      current().reconciler.observeVersion({ type: 'nft', id }, version),
    observeOrder: (order) => current().reconciler.observeOrder(order),
    reset: () => reconciler.reset(),
  }
}
