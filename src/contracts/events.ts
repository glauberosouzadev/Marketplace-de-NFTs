import type { EthString, IsoDate } from './entities'
import type { OrderStatus } from './entities'

/** Envelope Socket.IO (TSD-04). */
export type EventAudience = 'public' | `user:${string}`

export interface NftUpdatedData {
  priceFrom: EthString
  previousPrice?: EthString
  editions: Array<{ id: string; price: EthString; available: number }>
}

export interface OrderUpdatedData {
  status: OrderStatus
  txHash?: string
  explorerUrl?: string
  rejectReason?: string
  settledAt?: IsoDate
}

interface BaseEvent {
  /** Único e estável. */
  id: string
  /** Monotônica por recurso; igual a Nft.version / Order.version. */
  version: number
  occurredAt: IsoDate
  audience: EventAudience
}

export interface NftUpdatedEvent extends BaseEvent {
  type: 'nft.updated'
  resource: { type: 'nft'; id: string }
  data: NftUpdatedData
}

export interface OrderUpdatedEvent extends BaseEvent {
  type: 'order.updated'
  resource: { type: 'order'; id: string }
  data: OrderUpdatedData
}

export type KurioEvent = NftUpdatedEvent | OrderUpdatedEvent
export type KurioEventType = KurioEvent['type']
