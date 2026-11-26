import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p aria-hidden className="text-6xl font-bold text-price">
        404
      </p>
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço que você tentou abrir não existe no Kurio.
      </p>
      <Link
        to="/"
        className="inline-flex h-[60px] items-center rounded-full bg-primary-gradient px-8 text-sm font-bold text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:h-[45px] lg:rounded-md lg:bg-primary lg:bg-none"
      >
        Voltar ao Início
      </Link>
    </main>
  )
}
