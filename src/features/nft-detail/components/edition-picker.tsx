import type { Edition } from '@/contracts'
import { cn } from '@/lib/cn'
import { isEditionAvailable } from '../quantity'

interface EditionPickerProps {
  editions: readonly Edition[]
  selectedId: string | undefined
  onSelect: (id: string) => void
}

/** Chips de edição como rádios nativos (setas do teclado); esgotada fica desabilitada com texto. */
export function EditionPicker({ editions, selectedId, onSelect }: EditionPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const available = isEditionAvailable(edition)
          return (
            <label key={edition.id} className={cn('relative', available && 'cursor-pointer')}>
              <input
                type="radio"
                name="edition"
                value={edition.id}
                checked={edition.id === selectedId}
                disabled={!available}
                onChange={() => onSelect(edition.id)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-sm',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card',
                  'border-border text-muted-foreground lg:rounded-sm',
                  'peer-checked:border-primary peer-checked:font-bold peer-checked:text-price',
                  !available && 'border-dashed opacity-70',
                )}
              >
                {edition.label}
                {!available && <span>· Esgotada</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
