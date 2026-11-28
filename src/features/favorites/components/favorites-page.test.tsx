import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NftSummary } from '@/contracts'

const state = vi.hoisted(() => ({
  result: {} as Record<string, unknown>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('../queries', () => ({ useFavorites: () => state.result }))
vi.mock('@/features/catalog/components/nft-grid', () => ({
  GRID_CLASS: 'grid',
  NftGrid: ({ items }: { items: NftSummary[] }) => <ul data-testid="grid">{items.length}</ul>,
}))
vi.mock('@/ui/shell/tab-bar', () => ({ TabBar: () => <nav>tabbar</nav> }))

import { FavoritesPage } from './favorites-page'

const render = () => renderToStaticMarkup(<FavoritesPage uid="u1" />)

describe('FavoritesPage', () => {
  beforeEach(() => {
    state.result = { data: undefined, isPending: false, isError: false, refetch: vi.fn() }
  })

  it('carregando: skeleton ocupado', () => {
    state.result = { ...state.result, isPending: true }
    const html = render()
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Favoritos')
    expect(html).toContain('tabbar')
  })

  it('vazio: mensagem e link ao catálogo', () => {
    state.result = { ...state.result, data: { items: [] } }
    const html = render()
    expect(html).toContain('Você ainda não favoritou nenhum NFT.')
    expect(html).toContain('href="/"')
    expect(html).toContain('Explorar NFTs')
  })

  it('erro: alerta com "Tentar novamente"', () => {
    state.result = { ...state.result, isError: true }
    const html = render()
    expect(html).toContain('role="alert"')
    expect(html).toContain('Tentar novamente')
  })

  it('lista: renderiza a grade com os NFTs', () => {
    const nft = { id: 'n1' } as NftSummary
    state.result = {
      ...state.result,
      data: { items: [{ nftId: 'n1', createdAt: 'x', nft }] },
    }
    expect(render()).toContain('data-testid="grid">1<')
  })
})
