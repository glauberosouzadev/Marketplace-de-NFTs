/**
 * Decimal de ETH com escala fixa de 18 casas sobre BigInt (ADR 0007).
 * Valores trafegam como string decimal; `Decimal` é a forma interna escalada.
 * Nenhum `number` é usado em valor ETH.
 */
export type Decimal = bigint

const SCALE = 18
const UNIT = 10n ** BigInt(SCALE)
const BPS_BASE = 10_000n
const PATTERN = /^\d+(\.\d{1,18})?$/

export class DecimalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecimalError'
  }
}

export function parse(input: string): Decimal {
  if (typeof input !== 'string' || !PATTERN.test(input)) {
    throw new DecimalError(`Valor ETH inválido: "${String(input)}"`)
  }
  const [whole = '0', fraction = ''] = input.split('.')
  return BigInt(whole) * UNIT + BigInt(fraction.padEnd(SCALE, '0'))
}

export function toString(value: Decimal): string {
  if (value < 0n) throw new DecimalError('Valor ETH não pode ser negativo')
  const whole = value / UNIT
  const fraction = (value % UNIT).toString().padStart(SCALE, '0').replace(/0+$/, '')
  return fraction === '' ? whole.toString() : `${whole}.${fraction}`
}

export function add(a: Decimal, b: Decimal): Decimal {
  return a + b
}

export function sub(a: Decimal, b: Decimal): Decimal {
  if (b > a) throw new DecimalError('Subtração resultaria em valor negativo')
  return a - b
}

function toBigIntInteger(n: number | bigint, label: string): bigint {
  if (typeof n === 'bigint') return n
  if (!Number.isSafeInteger(n)) throw new DecimalError(`${label} deve ser inteiro: ${n}`)
  return BigInt(n)
}

/** Multiplica por uma quantidade inteira não negativa. */
export function mulInt(value: Decimal, quantity: number | bigint): Decimal {
  const q = toBigIntInteger(quantity, 'Quantidade')
  if (q < 0n) throw new DecimalError('Quantidade não pode ser negativa')
  return value * q
}

/** Aplica pontos-base (1 bp = 0,01%), arredondando para baixo. */
export function applyBps(value: Decimal, bps: number | bigint): Decimal {
  const b = toBigIntInteger(bps, 'Bps')
  if (b < 0n) throw new DecimalError('Bps não pode ser negativo')
  return (value * b) / BPS_BASE
}

export function compare(a: Decimal, b: Decimal): -1 | 0 | 1 {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export const ZERO: Decimal = 0n
