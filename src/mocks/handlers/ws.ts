import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { KurioEvent, Nft, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/contracts'
import { getDb, mutateDb, nextEventId, nextVersion } from '../db/store'
import { resolveSessionToken } from './util'

// O binding anuncia pingInterval 25 s + pingTimeout 5 s; sem ping o cliente cai a cada 30 s.
const PING_INTERVAL_MS = 25_000

interface RealtimeConnection {
  io: ReturnType<typeof toSocketIo>
  close: () => void
  userId: string | null
}

const connections = new Set<RealtimeConnection>()
let realtimeDown = false
let lastEvent: KurioEvent | null = null

function userIdFromConnectPacket(data: unknown): string | null | undefined {
  if (typeof data !== 'string' || !data.startsWith('40')) return undefined
  try {
    const auth = JSON.parse(data.slice(2) || '{}') as { token?: unknown }
    const token = typeof auth.token === 'string' ? auth.token : null
    return token ? (resolveSessionToken(token)?.user.id ?? null) : null
  } catch {
    return null
  }
}

export const realtimeHandler = ws
  .link('wss://realtime.kurio.invalid')
  .addEventListener('connection', (connection) => {
    const { client } = connection
    if (realtimeDown) {
      client.close()
      return
    }
    const entry: RealtimeConnection = {
      io: toSocketIo(connection),
      close: () => client.close(),
      userId: null,
    }
    connections.add(entry)
    const ping = setInterval(() => client.send('2'), PING_INTERVAL_MS)
    client.addEventListener('message', (event) => {
      const userId = userIdFromConnectPacket(event.data)
      if (userId !== undefined) entry.userId = userId
    })
    client.addEventListener('close', () => {
      clearInterval(ping)
      connections.delete(entry)
    })
  })

// Fecha no transporte: um pacote Socket.IO de disconnect desligaria a reconexão (TSD-04).
export function setRealtimeDown(down: boolean): void {
  realtimeDown = down
  if (down) connections.forEach((connection) => connection.close())
}

export function emitEvent(event: KurioEvent): void {
  lastEvent = event
  connections.forEach(({ io, userId }) => {
    if (event.audience === 'public' || event.audience === `user:${userId}`) {
      io.client.emit(event.type, event)
    }
  })
}

export interface UpdateNftInput {
  nftId: string
  editionId: string
  price?: string
  available?: number
}

export function updateNft(input: UpdateNftInput): void {
  const updated = mutateDb((db) => {
    const nft = db.nfts.find((n) => n.id === input.nftId)
    const edition = nft?.editions.find((e) => e.id === input.editionId)
    if (!nft || !edition) return null
    if (input.price !== undefined) {
      nft.previousPrice = nft.priceFrom
      nft.priceFrom = input.price
      edition.price = input.price
    }
    if (input.available !== undefined) {
      edition.available = input.available
      edition.soldOut = input.available <= 0
    }
    nft.version = nextVersion(nft.version)
    return structuredClone(nft)
  })
  if (updated) emitEvent(buildNftEvent(updated, updated.version))
}

export function buildNftEvent(nft: Nft, version: number): NftUpdatedEvent {
  return {
    id: nextEventId(),
    version,
    occurredAt: new Date().toISOString(),
    audience: 'public',
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    data: {
      priceFrom: nft.priceFrom,
      ...(nft.previousPrice !== undefined ? { previousPrice: nft.previousPrice } : {}),
      editions: nft.editions.map((e) => ({ id: e.id, price: e.price, available: e.available })),
    },
  }
}

export function replayLastEvent(): void {
  if (lastEvent) emitEvent(lastEvent)
}

export function emitStale(resource: KurioEvent['resource']): void {
  const db = getDb()
  if (resource.type === 'nft') {
    const nft = db.nfts.find((n) => n.id === resource.id)
    if (nft) emitEvent(buildNftEvent(nft, nft.version - 1))
    return
  }
  const order = db.orders.find((o) => o.id === resource.id)
  if (!order) return
  emitEvent(buildOrderEvent(order, order.version - 1))
}

export function buildOrderEvent(order: Order, version: number): OrderUpdatedEvent {
  return {
    id: nextEventId(),
    version,
    occurredAt: new Date().toISOString(),
    audience: `user:${order.userId}`,
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    data: {
      status: order.status,
      ...(order.txHash !== undefined ? { txHash: order.txHash } : {}),
      ...(order.explorerUrl !== undefined ? { explorerUrl: order.explorerUrl } : {}),
      ...(order.rejectReason !== undefined ? { rejectReason: order.rejectReason } : {}),
      ...(order.settledAt !== undefined ? { settledAt: order.settledAt } : {}),
    },
  }
}
