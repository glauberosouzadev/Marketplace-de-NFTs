import type { Edition } from '@/contracts'

/** Regras de edição e quantidade (FR-11, FR-12, RN-02). Funções puras. */

export const isEditionAvailable = (edition: Edition): boolean =>
  !edition.soldOut && edition.available >= 1

/** Edição pedida na URL se existir e estiver disponível; senão, a primeira disponível. */
export function resolveEdition(
  editions: readonly Edition[],
  requestedId: string | undefined,
): Edition | undefined {
  const requested = editions.find((e) => e.id === requestedId)
  if (requested && isEditionAvailable(requested)) return requested
  return editions.find(isEditionAvailable)
}

export type QuantityResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'invalid' | 'above-limit' }

const INTEGER = /^\d+$/

/** Aceita só inteiros de 1 até `max`; nada é ajustado em silêncio. */
export function parseQuantity(input: string, max: number): QuantityResult {
  const trimmed = input.trim()
  if (!INTEGER.test(trimmed)) return { ok: false, reason: 'invalid' }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value) || value < 1) return { ok: false, reason: 'invalid' }
  if (value > max) return { ok: false, reason: 'above-limit' }
  return { ok: true, value }
}

export const canIncrement = (quantity: number, max: number): boolean => quantity < max
export const canDecrement = (quantity: number): boolean => quantity > 1

/** Ao trocar de edição: mantém a quantidade se couber, senão reduz ao novo limite. */
export function fitToLimit(quantity: number, max: number): { value: number; adjusted: boolean } {
  if (quantity <= max) return { value: Math.max(1, quantity), adjusted: false }
  return { value: Math.max(1, max), adjusted: true }
}

const unidades = (n: number): string => (n === 1 ? '1 unidade' : `${n} unidades`)

export const limitMessage = (max: number): string =>
  `Limite atingido: máximo de ${unidades(max)} nesta edição.`

export function quantityErrorMessage(reason: 'invalid' | 'above-limit', max: number): string {
  return reason === 'above-limit'
    ? `Quantidade acima do disponível: máximo de ${unidades(max)}.`
    : `Informe um número inteiro entre 1 e ${max}.`
}

export const adjustedMessage = (max: number): string =>
  `Quantidade ajustada para ${max}, o máximo disponível nesta edição.`
