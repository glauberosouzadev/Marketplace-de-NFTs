import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    'aria-label'?: string
    className?: string
  }) => (
    <a href={to} aria-label={rest['aria-label']} className={rest.className}>
      {children}
    </a>
  ),
}))
vi.mock('./cart-badge', () => ({ CartBadge: () => null }))

import { Footer } from './footer'
import { TabBar } from './tab-bar'

describe('navegação do shell', () => {
  it('tab bar: Favoritos e Perfil são links; Ação rápida segue inerte', () => {
    const html = renderToStaticMarkup(<TabBar />)
    expect(html).toMatch(/<a href="\/favoritos"[^>]*aria-label="Favoritos"/)
    expect(html).toMatch(/<a href="\/perfil"[^>]*aria-label="Perfil"/)
    expect(html).toMatch(/<button[^>]*aria-label="Ação rápida"/)
  })

  it('rodapé: só "Lista de interesse" navega; "Meu perfil" continua botão', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toMatch(/<a href="\/favoritos"[^>]*>Lista de interesse<\/a>/)
    expect(html).toMatch(/<button[^>]*>Minha coleção<\/button>/)
    expect(html).not.toContain('href="/perfil"')
  })
})
