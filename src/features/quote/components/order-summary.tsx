import type { CartItem, Quote, QuoteIssue } from '@/contracts'
import { discountText, issueText } from '../presentation'

interface OrderSummaryProps {
  quote: Quote
  items: readonly CartItem[]
  /** Permite ao CTA apontar para os avisos que o bloqueiam (`aria-describedby`). */
  issuesId?: string
}

const rowClass = 'flex items-start justify-between gap-4'
const valueClass = 'min-w-0 text-right break-all'

function issueName(issue: QuoteIssue, items: readonly CartItem[]): string | undefined {
  return items.find((i) => i.nftId === issue.nftId && i.editionId === issue.editionId)?.name
}

/** Valores exibidos exatamente como vêm da cotação (RN-04): nenhuma conta no cliente. */
export function OrderSummary({ quote, items, issuesId }: OrderSummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-3 text-sm">
        <div className={rowClass}>
          <dt>Subtotal</dt>
          <dd className={valueClass}>{quote.subtotal} ETH</dd>
        </div>
        <div className={rowClass}>
          <dt>Desconto do lançamento</dt>
          <dd className={valueClass}>{discountText(quote)}</dd>
        </div>
        <div className={rowClass}>
          <dt>Taxa de rede</dt>
          <dd className={`${valueClass} flex flex-col items-end`}>
            <span>{quote.networkFee} ETH</span>
            <span className="text-price text-[10px]">Taxa estimada</span>
          </dd>
        </div>
        <div className={`${rowClass} items-center font-bold`}>
          <dt className="text-base">Total</dt>
          <dd className={`${valueClass} text-price text-xl`}>{quote.total} ETH</dd>
        </div>
      </dl>
      {quote.issues.length > 0 && (
        <ul
          id={issuesId}
          aria-label="Avisos do resumo"
          className="text-warning flex flex-col gap-1 text-xs"
        >
          {quote.issues.map((issue, index) => (
            <li key={`${issue.type}:${issue.nftId ?? ''}:${issue.editionId ?? ''}:${index}`}>
              {issueText(issue, issueName(issue, items))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
