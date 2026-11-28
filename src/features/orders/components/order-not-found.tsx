import { Link } from '@tanstack/react-router'
import { Button } from '@/ui/button'

/** Pedido inexistente ou de outro usuário: o mesmo texto, sem indicar qual dos dois (FR-35). */
export function OrderNotFound() {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <p aria-hidden className="text-price text-5xl font-bold">
        404
      </p>
      <p className="text-xl font-bold">Pedido não encontrado</p>
      <p className="text-muted-foreground max-w-md text-sm">
        Este pedido não existe ou não está disponível para a sua conta.
      </p>
      <Button asChild>
        <Link to="/" className="px-8">
          Voltar ao Início
        </Link>
      </Button>
    </div>
  )
}
