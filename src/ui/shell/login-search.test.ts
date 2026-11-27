import { describe, expect, it } from 'vitest'
import { loginSearch } from './login-search'

describe('loginSearch', () => {
  it('repassa a rota atual', () => {
    expect(loginSearch('/carrinho')).toEqual({ redirect: '/carrinho' })
  })
  it('omite o padrão e as telas de auth', () => {
    expect(loginSearch('/')).toEqual({})
    expect(loginSearch('/login?redirect=%2Fcarrinho')).toEqual({})
    expect(loginSearch('/cadastro')).toEqual({})
  })
  it('rejeita destino externo', () => {
    expect(loginSearch('//evil.com')).toEqual({})
  })
})
