import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { SearchField } from '@/features/catalog/components/search-field'
import { cn } from '@/lib/cn'
import { OutOfScopeButton } from './out-of-scope'

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
  const closeSearch = () => {
    setSearchOpen(false)
    searchButton.current?.focus()
  }
  return (
    <header className="mx-auto hidden w-full max-w-[1200px] lg:block">
      <div className="flex h-[68px] items-center justify-between border-b border-border-strong">
        <Link
          to="/"
          className="text-xs font-bold tracking-[0.2em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search aria-hidden className="size-5" />
          </button>
          <OutOfScopeButton
            aria-label="Carrinho"
            className="grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShoppingCart aria-hidden className="size-5" />
          </OutOfScopeButton>
          <OutOfScopeButton className="flex h-[35px] items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground outline-none hover:bg-price focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <LogIn aria-hidden className="size-4" />
            Entrar
          </OutOfScopeButton>
        </div>
      </div>
    </header>
  )
}
