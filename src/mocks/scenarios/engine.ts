import { createPrng } from './prng'
import type { LatencySpec, RoutePlan, RouteRule, Scenario } from './types'

/** Acima do timeout padrão do Axios (5000 ms, `VITE_HTTP_TIMEOUT_MS`). */
export const TIMEOUT_DELAY_MS = 8000

export interface ScenarioEngine {
  scenario: Scenario
  plan(routeKey: string): RoutePlan
}

export function createEngine(scenario: Scenario): ScenarioEngine {
  const random = createPrng(scenario.seed)
  const calls = new Map<string, number>()

  const ruleFor = (routeKey: string): RouteRule =>
    scenario.routes[routeKey] ?? scenario.routes['*'] ?? {}

  function latencyMs(spec: LatencySpec, callIndex: number): number {
    switch (spec.kind) {
      case 'fixed':
        return spec.ms
      case 'sequence':
        return spec.ms[callIndex % spec.ms.length] ?? 0
      case 'variable':
        return Math.round(spec.minMs + random() * (spec.maxMs - spec.minMs))
    }
  }

  return {
    scenario,
    plan(routeKey) {
      const callIndex = calls.get(routeKey) ?? 0
      calls.set(routeKey, callIndex + 1)
      const rule = ruleFor(routeKey)
      const failTimes = rule.failTimes ?? 'always'
      const failing = rule.failure && (failTimes === 'always' || callIndex < failTimes)
      const failure = failing ? rule.failure! : null
      const baseDelay = latencyMs(rule.latency ?? scenario.latency, callIndex)
      const delayMs =
        failure?.kind === 'timeout' ? Math.max(baseDelay, TIMEOUT_DELAY_MS) : baseDelay
      return { delayMs, failure }
    },
  }
}
