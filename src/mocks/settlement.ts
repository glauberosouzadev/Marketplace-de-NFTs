import { settleOrder as settleInDb, type SettlementStatus } from './db/orders'
import { buildNftEvent, buildOrderEvent, emitEvent } from './handlers/ws'

/** REST e evento juntos (SDD-08): os eventos saem só se a liquidação mudou o banco. */
export function settleOrder(orderId: string, status: SettlementStatus): void {
  const settled = settleInDb(orderId, status)
  if (!settled) return
  emitEvent(buildOrderEvent(settled.order, settled.order.version))
  settled.nfts.forEach((nft) => emitEvent(buildNftEvent(nft, nft.version)))
}
