interface CatalogErrorProps {
  onRetry: () => void
  /** Aviso acima da grade já exibida (refetch falhou com dados em cache). */
  compact?: boolean
}

export function CatalogError({ onRetry, compact = false }: CatalogErrorProps) {
  return (
    <div
      role="alert"
      className={compact ? 'flex flex-col items-center gap-3 pb-6 text-center' : 'flex flex-col items-center gap-6 py-16 text-center'}
    >
      <h2 className="text-lg font-bold">Não foi possível carregar os NFTs</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Houve um problema de conexão ou do servidor. Tente novamente.
      </p>
      <button type="button" onClick={onRetry} className="inline-flex h-[60px] items-center rounded-full bg-primary-gradient px-8 text-sm font-bold text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-[45px] md:rounded-md md:bg-primary md:bg-none">
        Tentar novamente
      </button>
    </div>
  )
}
