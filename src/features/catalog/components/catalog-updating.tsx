/** Região aria-live sempre montada; o texto só aparece durante o refetch. */
export function CatalogUpdating({ active }: { active: boolean }) {
  return (
    <div role="status" aria-live="polite" className="h-5 text-xs text-muted-foreground">
      {active && (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
          Atualizando…
        </span>
      )}
    </div>
  )
}
