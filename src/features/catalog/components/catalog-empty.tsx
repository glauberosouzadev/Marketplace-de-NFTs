export function CatalogEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h2 className="text-lg font-bold">Nenhum NFT encontrado</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Nenhum item corresponde à busca ou aos filtros atuais.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="bg-primary-gradient text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background md:bg-primary inline-flex h-[60px] items-center rounded-full px-8 text-sm font-bold outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 md:h-[45px] md:rounded-md md:bg-none"
      >
        Limpar filtros
      </button>
    </div>
  )
}
