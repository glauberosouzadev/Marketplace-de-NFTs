import type { CartItem, Quote, QuoteCoupon, QuoteLine } from '@/contracts'
import { compare, parse } from '@/contracts/decimal'
import { errorMessage } from '@/http/error-messages'
import { hasBlockingIssue, isBlockingIssue, issueText } from '@/features/quote/presentation'
import { NETWORK_OPTIONS } from '@/features/wallets/validation'
import { canEditFields, type CheckoutStatus } from './checkout-machine'

/** Um valor da revisão que mudou na cotação atual (FR-31: `previous → current`). */
export interface QuoteChange {
  id: string
  label: string
  previous: string
  current: string
}

const sameEth = (a: string, b: string): boolean => compare(parse(a), parse(b)) === 0

const lineKey = (line: Pick<QuoteLine, 'nftId' | 'editionId'>): string =>
  `${line.nftId}:${line.editionId}`

const availabilityText = (available: number): string =>
  available === 0 ? 'Esgotado' : `${available} ${available === 1 ? 'disponível' : 'disponíveis'}`

const COUPON_STATUS: Record<QuoteCoupon['status'], string> = {
  applied: 'aplicado',
  invalid: 'inválido',
  expired: 'expirado',
}

const couponText = (coupon: QuoteCoupon | undefined): string =>
  coupon ? `${coupon.code} ${COUPON_STATUS[coupon.status]}` : 'Sem cupom'

const networkText = (quote: Quote): string =>
  NETWORK_OPTIONS.find((option) => option.value === quote.network)?.label ?? quote.network

function lineChanges(
  key: string,
  name: string,
  previous: QuoteLine | undefined,
  current: QuoteLine | undefined,
): QuoteChange[] {
  const changes: QuoteChange[] = []
  if ((previous?.quantity ?? 0) !== (current?.quantity ?? 0)) {
    changes.push({
      id: `${key}:quantity`,
      label: `Quantidade de ${name}`,
      previous: String(previous?.quantity ?? 0),
      current: String(current?.quantity ?? 0),
    })
  }
  if (!previous || !current) return changes
  if (!sameEth(previous.unitPrice, current.unitPrice)) {
    changes.push({
      id: `${key}:price`,
      label: `Preço de ${name}`,
      previous: `${previous.unitPrice} ETH`,
      current: `${current.unitPrice} ETH`,
    })
  }
  if (previous.available !== current.available) {
    changes.push({
      id: `${key}:available`,
      label: `Disponibilidade de ${name}`,
      previous: availabilityText(previous.available),
      current: availabilityText(current.available),
    })
  }
  return changes
}

const AMOUNTS = [
  ['subtotal', 'Subtotal'],
  ['discount', 'Desconto do lançamento'],
  ['networkFee', 'Taxa de rede'],
  ['total', 'Total'],
] as const

/**
 * Diferenças entre a cotação revisada e a atual, na ordem do resumo. Cobre tudo o que entra no
 * fingerprint (linhas, disponibilidade, cupom, rede e taxa) e os valores derivados da `Quote`.
 */
export function quoteChanges(
  reviewed: Quote,
  current: Quote,
  items: readonly CartItem[],
): QuoteChange[] {
  const nameOf = (line: QuoteLine): string =>
    items.find((item) => lineKey(item) === lineKey(line))?.name ?? 'item'
  const currentLines = new Map(current.lines.map((line) => [lineKey(line), line]))
  const reviewedKeys = new Set(reviewed.lines.map(lineKey))

  const lines = [
    ...reviewed.lines.map((line) =>
      lineChanges(lineKey(line), nameOf(line), line, currentLines.get(lineKey(line))),
    ),
    ...current.lines
      .filter((line) => !reviewedKeys.has(lineKey(line)))
      .map((line) => lineChanges(lineKey(line), nameOf(line), undefined, line)),
  ].flat()

  const coupon =
    couponText(reviewed.coupon) === couponText(current.coupon)
      ? []
      : [
          {
            id: 'coupon',
            label: 'Cupom',
            previous: couponText(reviewed.coupon),
            current: couponText(current.coupon),
          },
        ]
  const network =
    reviewed.network === current.network
      ? []
      : [
          {
            id: 'network',
            label: 'Rede',
            previous: networkText(reviewed),
            current: networkText(current),
          },
        ]
  const amounts = AMOUNTS.filter(([field]) => !sameEth(reviewed[field], current[field])).map(
    ([field, label]) => ({
      id: field,
      label,
      previous: `${reviewed[field]} ETH`,
      current: `${current[field]} ETH`,
    }),
  )
  return [...lines, ...coupon, ...network, ...amounts]
}

/** Troca de rede ou de cupom feita pelo próprio usuário vira a nova revisão, sem diff. */
export const isUserDriven = (reviewed: Quote, current: Quote): boolean =>
  reviewed.network !== current.network ||
  (reviewed.coupon?.code ?? null) !== (current.coupon?.code ?? null)

/** J-04: cotação atual diferente da revisada (ou revalidação divergente) exige nova revisão. */
export const isOutdated = (
  status: CheckoutStatus,
  reviewed: Quote | null,
  current: Quote | undefined,
): boolean =>
  status === 'stale' ||
  (reviewed !== null && current !== undefined && reviewed.fingerprint !== current.fingerprint)

export type ConfirmBlock = 'locked' | 'outdated' | 'unavailable' | 'issues'

/** Motivo de "Confirmar compra" estar bloqueado; `null` libera a revisão/revalidação. */
export function confirmBlock(
  status: CheckoutStatus,
  outdated: boolean,
  current: Quote | undefined,
): ConfirmBlock | null {
  if (!canEditFields(status)) return 'locked'
  if (outdated) return 'outdated'
  if (!current) return 'unavailable'
  return hasBlockingIssue(current) ? 'issues' : null
}

/** Texto do motivo do bloqueio, descrição acessível de "Confirmar compra" (SDD-12). */
export function blockReason(
  block: ConfirmBlock | null,
  current: Quote | undefined,
  items: readonly CartItem[],
): string | null {
  if (block === 'outdated') return errorMessage('QUOTE_STALE')
  if (block !== 'issues' || !current) return null
  return current.issues
    .filter(isBlockingIssue)
    .map((issue) =>
      issueText(
        issue,
        items.find((i) => i.nftId === issue.nftId && i.editionId === issue.editionId)?.name,
      ),
    )
    .join(' ')
}
