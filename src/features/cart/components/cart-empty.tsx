import { Link } from '@tanstack/react-router'

export function CartEmpty() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Adicione NFTs do catálogo para revisar a compra aqui.
      </p>
      <Link
        to="/"
        className="bg-primary-gradient text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background lg:bg-primary inline-flex h-[60px] items-center rounded-full px-8 text-sm font-bold outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 lg:h-[45px] lg:rounded-md lg:bg-none"
      >
        Explorar o catálogo
      </Link>
    </div>
  )
}
