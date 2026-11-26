import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import {
  canDecrement,
  canIncrement,
  limitMessage,
  parseQuantity,
  quantityErrorMessage,
  type QuantityResult,
} from '../quantity'

interface QuantityStepperProps {
  draft: string
  max: number
  disabled?: boolean
  onChange: (draft: string) => void
}

const circleClass =
  'grid size-6 place-items-center rounded-full bg-primary text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:brightness-100'

function stepperMessage(parsed: QuantityResult, atLimit: boolean, max: number, disabled: boolean) {
  if (disabled) return null
  if (!parsed.ok) return quantityErrorMessage(parsed.reason, max)
  return atLimit ? limitMessage(max) : null
}

/** "Qtd." com −/+ e campo editável; entrada inválida fica visível com mensagem, nunca é corrigida em silêncio. */
export function QuantityStepper({ draft, max, disabled = false, onChange }: QuantityStepperProps) {
  const inputId = useId()
  const messageId = useId()
  const parsed = parseQuantity(draft, max)
  const quantity = parsed.ok ? parsed.value : null
  const atLimit = quantity !== null && !canIncrement(quantity, max)
  const message = stepperMessage(parsed, atLimit, max, disabled)
  // aria-disabled em vez de disabled: o "+" mantém o foco ao atingir o limite.
  const incrementBlocked = quantity === null || atLimit

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <label htmlFor={inputId} className="text-sm text-muted-foreground">
          Qtd.
        </label>
        <button
          type="button"
          aria-label="Diminuir quantidade"
          aria-controls={inputId}
          disabled={disabled || quantity === null || !canDecrement(quantity)}
          onClick={() => quantity !== null && onChange(String(quantity - 1))}
          className={circleClass}
        >
          <Minus aria-hidden className="size-3.5" />
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          disabled={disabled}
          aria-invalid={!parsed.ok && !disabled}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="w-8 rounded-sm bg-transparent text-center text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:text-destructive"
        />
        <button
          type="button"
          aria-label="Aumentar quantidade"
          aria-controls={inputId}
          disabled={disabled}
          aria-disabled={incrementBlocked || undefined}
          onClick={() => !incrementBlocked && onChange(String(quantity + 1))}
          className={circleClass}
        >
          <Plus aria-hidden className="size-3.5" />
        </button>
      </div>
      <p
        id={messageId}
        role="status"
        className={parsed.ok ? 'text-xs text-muted-foreground empty:hidden' : 'text-xs text-destructive empty:hidden'}
      >
        {message}
      </p>
    </div>
  )
}
