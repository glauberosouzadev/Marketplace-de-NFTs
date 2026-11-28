import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NftSummary } from '@/contracts'

const state = vi.hoisted(() => ({ favorite: false }))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn(), state: { location: { href: '/' } } }),
}))
vi.mock('@/features/session/queries', () => ({ useSession: () => ({ data: { id: 'u1' } }) }))
vi.mock('../queries', () => ({ useIsFavorite: () => state.favorite }))
vi.mock('../mutations', () => ({ useToggleFavorite: () => ({ mutate: vi.fn() }) }))

import { FavoriteButton, resolveFavoriteClick } from './favorite-button'

const nft = { id: 'n1', name: 'Aurora' } as NftSummary

describe('FavoriteButton', () => {
  beforeEach(() => {
    state.favorite = false
  })

  it('não favorito: aria-pressed false e rótulo "Favoritar"', () => {
    const html = renderToStaticMarkup(<FavoriteButton nft={nft} />)
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('aria-label="Favoritar Aurora"')
    expect(html).not.toContain('fill-current')
  })

  it('favorito: aria-pressed true, rótulo de remoção e ícone preenchido', () => {
    state.favorite = true
    const html = renderToStaticMarkup(<FavoriteButton nft={nft} />)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-label="Remover Aurora dos favoritos"')
    expect(html).toContain('fill-current')
  })
})

describe('resolveFavoriteClick', () => {
  it('visitante vai ao login com redirect da página atual', () => {
    expect(resolveFavoriteClick(undefined, false, '/nft/n1?e=2')).toEqual({
      kind: 'login',
      href: '/login?redirect=%2Fnft%2Fn1%3Fe%3D2',
    })
  })

  it('logado inverte o estado', () => {
    expect(resolveFavoriteClick('u1', false, '/')).toEqual({ kind: 'toggle', favorite: true })
    expect(resolveFavoriteClick('u1', true, '/')).toEqual({ kind: 'toggle', favorite: false })
  })
})
