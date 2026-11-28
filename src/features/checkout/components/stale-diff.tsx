import { errorMessage } from '@/http/error-messages'
import { Button } from '@/ui/button'
import type { QuoteChange } from '../revalidation'

interface StaleDiffProps {
  changes: readonly QuoteChange[]
  canAccept: boolean
  onAccept: () => void
}

/** FR-31: valores que mudaram desde a revisão (`anterior → atual`); nunca só por cor. */
export function StaleDiff({ changes, canAccept, onAccept }: StaleDiffProps) {
  return (
    <div className="border-warning flex flex-col gap-3 rounded-3xl border p-4 lg:rounded-md">
      <p role="alert" className="text-warning text-sm font-bold">
        {errorMessage('QUOTE_STALE')}
      </p>
      {changes.length > 0 && (
        <ul aria-label="Valores alterados" className="flex flex-col gap-2 text-sm">
          {changes.map((change) => (
            <li key={change.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span>{change.label}</span>
              <span className="min-w-0 text-right break-all">
                <del className="text-muted-foreground">{change.previous}</del>
                <span aria-hidden> → </span>
                <span className="sr-only"> para </span>
                <ins className="text-price font-bold no-underline">{change.current}</ins>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canAccept}
        onClick={onAccept}
        className="text-foreground self-start"
      >
        Aceitar novos valores
      </Button>
    </div>
  )
}
