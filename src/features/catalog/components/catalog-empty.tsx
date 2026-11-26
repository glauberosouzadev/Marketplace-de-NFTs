export function CatalogEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h2 className="text-lg font-bold">Nenhum NFT encontrado</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Nenhum item corresponde à busca ou aos filtros atuais.
      </p>
      <button type="button" onClick={onClear} className="inline-flex h-[60px] items-center rounded-full bg-primary-gradient px-8 text-sm font-bold text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-[45px] md:rounded-md md:bg-primary md:bg-none">
        Limpar filtros
      </button>
    </div>
  )
}
