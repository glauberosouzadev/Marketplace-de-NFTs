import type { Cart, KurioEvent, Order, OrderStatus } from '@/contracts'
import { clearPersisted } from './db/persist'
import { getDb, mutateDb, nextVersion } from './db/store'
import {
  buildOrderEvent,
  emitEvent,
  emitStale,
  replayLastEvent,
  setRealtimeDown,
  updateNft,
  type UpdateNftInput,
} from './handlers/ws'
import { activateScenario } from './scenarios/active'
import { findScenario } from './scenarios/definitions'

export interface MockControl {
  reset(): void
  setScenario(id: string): void
  updateNft(input: UpdateNftInput): void
  soldOut(nftId: string, editionId: string): void
  dropRealtime(): void
  restoreRealtime(): void
  replayLastEvent(): void
  emitStale(resource: KurioEvent['resource']): void
  settleOrder(orderId: string, status: Exclude<OrderStatus, 'pending'>): void
  expireSession(): void
  listOrders(): Order[]
  listCarts(): Cart[]
}

function setScenario(id: string): void {
  if (!findScenario(id)) return
  mutateDb((db) => {
    db.meta.scenario = id
  })
  activateScenario(id)
}

function settleOrder(orderId: string, status: Exclude<OrderStatus, 'pending'>): void {
  const settled = mutateDb((db) => {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) return null
    order.status = status
    order.version = nextVersion(order.version)
    order.settledAt = new Date().toISOString()
    return structuredClone(order)
  })
  if (settled) emitEvent(buildOrderEvent(settled, settled.version))
}

function expireSession(): void {
  const expiredAt = new Date(Date.now() - 1000).toISOString()
  mutateDb((db) => {
    db.sessions.forEach((session) => {
      session.expiresAt = expiredAt
    })
  })
}

/** Aplica `?reset=1` e `?scenario=` na carga e remove ambos da URL (`?panel=0` é do painel). */
export function applyUrlParams(): void {
  const url = new URL(window.location.href)
  const { searchParams } = url
  if (searchParams.get('reset') === '1') clearPersisted()
  const scenario = searchParams.get('scenario')
  if (scenario) setScenario(scenario)
  if (searchParams.has('reset') || searchParams.has('scenario')) {
    searchParams.delete('reset')
    searchParams.delete('scenario')
    window.history.replaceState(null, '', url)
  }
}

export function installMockControl(): void {
  const control: MockControl = {
    reset: () => {
      clearPersisted()
      window.location.reload()
    },
    setScenario,
    updateNft,
    soldOut: (nftId, editionId) => updateNft({ nftId, editionId, available: 0 }),
    dropRealtime: () => setRealtimeDown(true),
    restoreRealtime: () => setRealtimeDown(false),
    replayLastEvent,
    emitStale,
    settleOrder,
    expireSession,
    listOrders: () => structuredClone(getDb().orders),
    listCarts: () => structuredClone(getDb().carts),
  }
  Object.assign(window, { __kurioMock: control })
}
