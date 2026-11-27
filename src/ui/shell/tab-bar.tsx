import { Link } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'
import { CartBadge } from './cart-badge'
import { OutOfScopeButton } from './out-of-scope'

const itemClass =
  'grid size-12 place-items-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Tab bar mobile/tablet; a rota decide onde exibi-la (Início e Favoritos). */
export function TabBar() {
  return (
    <nav
      aria-label="Navegação principal"
      className="bg-card fixed inset-x-0 bottom-0 z-40 grid h-[84px] grid-cols-5 items-center rounded-t-3xl px-4 lg:hidden"
    >
      <Link
        to="/"
        aria-label="Início"
        activeOptions={{ exact: true, includeSearch: false }}
        className={`${itemClass} justify-self-center`}
        activeProps={{
          'aria-current': 'page',
          className: `${itemClass} justify-self-center text-primary`,
        }}
      >
        <House aria-hidden className="size-6" />
      </Link>
      <OutOfScopeButton aria-label="Favoritos" className={`${itemClass} justify-self-center`}>
        <Heart aria-hidden className="size-6" />
      </OutOfScopeButton>
      <OutOfScopeButton
        aria-label="Ação rápida"
        className="bg-primary-gradient text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background relative -top-8 size-16 place-self-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <ScanLine aria-hidden className="mx-auto size-7" />
      </OutOfScopeButton>
      <Link
        to="/carrinho"
        aria-label="Carrinho"
        className={`${itemClass} relative justify-self-center`}
      >
        <ShoppingCart aria-hidden className="size-6" />
        <CartBadge />
      </Link>
      <OutOfScopeButton aria-label="Perfil" className={`${itemClass} justify-self-center`}>
        <User aria-hidden className="size-6" />
      </OutOfScopeButton>
    </nav>
  )
}
