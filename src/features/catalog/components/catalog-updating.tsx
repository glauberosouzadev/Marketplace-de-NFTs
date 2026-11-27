/** Região aria-live sempre montada; o texto só aparece durante o refetch. */
export function CatalogUpdating({ active }: { active: boolean }) {
  return (
    <div role="status" aria-live="polite" className="text-muted-foreground h-5 text-xs">
      {active && (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="bg-primary size-2 animate-pulse rounded-full motion-reduce:animate-none"
          />
          Atualizando…
        </span>
      )}
    </div>
  )
}
