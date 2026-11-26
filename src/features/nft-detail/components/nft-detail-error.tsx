export function NftDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-xl font-bold">Não foi possível carregar o NFT</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Houve um problema de conexão ou do servidor. Tente novamente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-[60px] items-center rounded-full bg-primary-gradient px-8 text-sm font-bold text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:h-[45px] lg:rounded-md lg:bg-primary lg:bg-none"
      >
        Tentar novamente
      </button>
    </div>
  )
}
