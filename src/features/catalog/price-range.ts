import { parse } from '@/contracts/decimal'

/**
 * Posição do slider em passos de 0,01 ETH. O inteiro é só um índice de posição:
 * toda conversão de/para string decimal usa bigint (nunca `number` como valor ETH).
 */
const STEP = 10n ** 16n
const DECIMAL = /^\d+(\.\d{1,18})?$/

export interface PriceBounds {
  min: string
  max: string
}

export type PriceRange = readonly [number, number]

const floorSteps = (value: string): bigint => parse(value) / STEP
const ceilSteps = (value: string): bigint => (parse(value) + STEP - 1n) / STEP

export function boundsToSteps(bounds: PriceBounds): PriceRange {
  const min = Number(floorSteps(bounds.min))
  return [min, Math.max(min, Number(ceilSteps(bounds.max)))]
}

/** Posição do slider -> string decimal com duas casas ("1.50"). */
export function stepsToPrice(steps: number): string {
  const value = BigInt(steps)
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`
}

export function formatRange([lo, hi]: PriceRange): string {
  return `Preço: ${stepsToPrice(lo)} - ${stepsToPrice(hi)} ETH`
}

/** Faixa do slider -> parâmetros da URL; extremos coincidentes com os limites não filtram. */
export function rangeToParams(
  bounds: PriceBounds,
  range: PriceRange,
): { priceMin: string | undefined; priceMax: string | undefined } {
  const [boundLo, boundHi] = boundsToSteps(bounds)
  return {
    priceMin: range[0] > boundLo ? stepsToPrice(range[0]) : undefined,
    priceMax: range[1] < boundHi ? stepsToPrice(range[1]) : undefined,
  }
}

/** Parâmetros da URL -> faixa do slider, contida nos limites. */
export function paramsToRange(
  bounds: PriceBounds,
  priceMin: string | undefined,
  priceMax: string | undefined,
): PriceRange {
  const [boundLo, boundHi] = boundsToSteps(bounds)
  const lo = priceMin && DECIMAL.test(priceMin) ? Number(floorSteps(priceMin)) : boundLo
  const hi = priceMax && DECIMAL.test(priceMax) ? Number(ceilSteps(priceMax)) : boundHi
  const clampedLo = Math.min(Math.max(lo, boundLo), boundHi)
  return [clampedLo, Math.max(clampedLo, Math.min(hi, boundHi))]
}
