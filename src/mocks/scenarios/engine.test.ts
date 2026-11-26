import { describe, expect, it } from 'vitest'
import { createEngine, TIMEOUT_DELAY_MS } from './engine'
import { SCENARIOS } from './definitions'
import { createPrng } from './prng'
import type { Scenario } from './types'

const make = (over: Partial<Scenario>): Scenario => ({
  id: 't',
  name: 't',
  description: '',
  seed: 1,
  latency: { kind: 'fixed', ms: 10 },
  routes: {},
  flows: {},
  ...over,
})
const fail = { kind: 'http', status: 503, code: 'TRANSIENT', message: 'x' } as const

describe('prng', () => {
  it('mesma seed, mesma sequencia', () => {
    const a = createPrng(7),
      b = createPrng(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('engine', () => {
  it('falha apenas nas N primeiras chamadas', () => {
    const e = createEngine(make({ routes: { 'GET /x': { failure: fail, failTimes: 2 } } }))
    const kinds = [1, 2, 3].map(() => e.plan('GET /x').failure?.kind ?? null)
    expect(kinds).toEqual(['http', 'http', null])
  })
  it('sequencia de latencia e variavel reproduzivel', () => {
    const seq = createEngine(make({ latency: { kind: 'sequence', ms: [5, 9] } }))
    expect([1, 2, 3].map(() => seq.plan('a').delayMs)).toEqual([5, 9, 5])
    const v = () => createEngine(make({ latency: { kind: 'variable', minMs: 10, maxMs: 100 } }))
    const run = (e: ReturnType<typeof v>) => [1, 2, 3].map(() => e.plan('a').delayMs)
    expect(run(v())).toEqual(run(v()))
  })
  it('timeout excede o do Axios e offline e sinalizado', () => {
    const e = createEngine(
      make({
        routes: { t: { failure: { kind: 'timeout' } }, o: { failure: { kind: 'offline' } } },
      }),
    )
    expect(e.plan('t').delayMs).toBeGreaterThanOrEqual(TIMEOUT_DELAY_MS)
    expect(e.plan('o').failure?.kind).toBe('offline')
  })
  it('S-03 usa N maior que retries + 1', () => {
    const s03 = SCENARIOS.find((s) => s.id === 'S-03')!
    expect(s03.routes['GET /nfts']?.failTimes).toBeGreaterThan(3)
  })
  it('ids estaveis default e S-01..S-09', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      'default',
      ...Array.from({ length: 9 }, (_, i) => `S-0${i + 1}`),
    ])
  })
})
