import { Link } from '@tanstack/react-router'

export function NftNotFound() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-xl font-bold">NFT não encontrado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Este item não existe ou foi removido do catálogo.
      </p>
      <Link
        to="/"
        className="inline-flex h-[60px] items-center rounded-full bg-primary-gradient px-8 text-sm font-bold text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:h-[45px] lg:rounded-md lg:bg-primary lg:bg-none"
      >
        Voltar ao Início
      </Link>
    </div>
  )
}
