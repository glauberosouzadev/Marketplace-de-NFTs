import type { ErrorCode, FieldErrors } from '@/contracts'

export type LatencySpec =
  | { kind: 'fixed'; ms: number }
  | { kind: 'sequence'; ms: readonly number[] }
  | { kind: 'variable'; minMs: number; maxMs: number }

export type FailureSpec =
  | { kind: 'http'; status: number; code: ErrorCode; message: string; fieldErrors?: FieldErrors }
  | { kind: 'offline' }
  | { kind: 'timeout' }

export interface RouteRule {
  latency?: LatencySpec
  failure?: FailureSpec
  failTimes?: 'always' | number
}

export interface ScenarioFlows {
  catalog?: 'empty'
  session?: 'expired' | 'unauthorized'
  purchase?: 'price-changed' | 'sold-out'
  /** `manual`: liquida só por `settleOrder`; `confirmed`/`declined` liquidam após a latência. */
  order?: 'manual' | 'confirmed' | 'declined' | 'timeout-after-create'
}

export interface Scenario {
  id: string
  name: string
  description: string
  seed: number
  latency: LatencySpec
  /** Chave `MÉTODO /caminho` (ex.: `GET /nfts`); `*` vale para as demais. */
  routes: Record<string, RouteRule>
  flows: ScenarioFlows
}

export interface RoutePlan {
  delayMs: number
  failure: FailureSpec | null
}
