import { useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { useSession } from '@/features/session/queries'
import { SearchField } from '@/features/catalog/components/search-field'
import { cn } from '@/lib/cn'
import { CartBadge } from './cart-badge'
import { loginSearch } from './login-search'
import { OutOfScopeButton } from './out-of-scope'
import { UserMenu } from './user-menu'

const linkClass =
  'relative flex h-full items-center px-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const activeClass =
  'font-bold text-price after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'

const linksAfterMarket = ['Criadores', 'Aprenda']

/**
 * Cabeçalho desktop (>= 1024 px). Abaixo disso o topo é de cada tela
 * (campo "Explorar coleções" no Início, botão de voltar nas demais), como no Figma mobile.
 */
export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const searchButton = useRef<HTMLButtonElement>(null)
  const { data: user } = useSession()
  const search = loginSearch(useRouterState({ select: (state) => state.location.href }))
  const closeSearch = () => {
    setSearchOpen(false)
    searchButton.current?.focus()
  }
  return (
    <header className="mx-auto hidden w-full max-w-[1200px] lg:block">
      <div className="border-border-strong flex h-[68px] items-center justify-between border-b">
        <Link
          to="/"
          className="focus-visible:ring-ring text-xs font-bold tracking-[0.2em] outline-none focus-visible:ring-2"
        >
          KURIO
        </Link>
        <nav aria-label="Principal" className="flex h-full items-center gap-10">
          <Link
            to="/"
            activeOptions={{ exact: true, includeSearch: false }}
            className={linkClass}
            activeProps={{ 'aria-current': 'page', className: cn(linkClass, activeClass) }}
          >
            Início
          </Link>
          <Link to="/" className={linkClass}>
            Mercado
          </Link>
          {linksAfterMarket.map((label) => (
            <OutOfScopeButton key={label} className={linkClass}>
              {label}
            </OutOfScopeButton>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {searchOpen && (
            <SearchField
              focusOnMount
              placeholder="Buscar NFTs"
              onEscape={closeSearch}
              className="w-[260px]"
            />
          )}
          <button
            ref={searchButton}
            type="button"
            aria-label="Buscar NFTs"
            aria-expanded={searchOpen}
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            className="focus-visible:ring-ring grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2"
          >
            <Search aria-hidden className="size-5" />
          </button>
          <Link
            to="/carrinho"
            aria-label="Carrinho"
            className="focus-visible:ring-ring relative grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2"
          >
            <ShoppingCart aria-hidden className="size-5" />
            <CartBadge />
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              to="/login"
              search={search}
              className="bg-primary text-primary-foreground hover:bg-price focus-visible:ring-ring focus-visible:ring-offset-background flex h-[35px] items-center gap-2 rounded-md px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <LogIn aria-hidden className="size-4" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
