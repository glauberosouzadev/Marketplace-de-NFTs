import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ result: {} as Record<string, unknown> }))

vi.mock('../queries', () => ({ useProfile: () => state.result }))
vi.mock('./profile-menu', () => ({ ProfileMenu: () => <nav>menu</nav> }))
vi.mock('./profile-form', () => ({ ProfileForm: () => <form>form</form> }))
vi.mock('@/ui/shell/back-button', () => ({ BackButton: () => <button>voltar</button> }))

import { ProfilePage } from './profile-page'

const render = () => renderToStaticMarkup(<ProfilePage uid="u1" />)

describe('ProfilePage', () => {
  beforeEach(() => {
    state.result = { data: undefined, isPending: false, refetch: vi.fn() }
  })

  it('carregando: skeleton com status', () => {
    state.result = { ...state.result, isPending: true }
    const html = render()
    expect(html).toContain('Carregando perfil')
    expect(html).toContain('Perfil do colecionador')
  })

  it('erro: alerta com "Tentar novamente"', () => {
    const html = render()
    expect(html).toContain('role="alert"')
    expect(html).toContain('Tentar novamente')
  })

  it('sucesso: menu e formulário', () => {
    state.result = { ...state.result, data: { displayName: 'Ana' } }
    const html = render()
    expect(html).toContain('menu')
    expect(html).toContain('form')
  })
})
