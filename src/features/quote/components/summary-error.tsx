export function SummaryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-2 text-center">
      <p className="text-muted-foreground text-sm">Não foi possível calcular o resumo.</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-price focus-visible:ring-ring rounded-sm text-sm font-bold underline-offset-4 outline-none hover:underline focus-visible:ring-2"
      >
        Tentar novamente
      </button>
    </div>
  )
}
