export function FavoritesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-6 py-16 text-center">
      <h2 className="text-lg font-bold">Não foi possível carregar seus favoritos</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Houve um problema de conexão ou do servidor. Tente novamente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-primary-gradient text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background md:bg-primary inline-flex h-[60px] items-center rounded-full px-8 text-sm font-bold outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 md:h-[45px] md:rounded-md md:bg-none"
      >
        Tentar novamente
      </button>
    </div>
  )
}
