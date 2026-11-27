import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AuthFormLogin } from './auth-form-login'

const render = (expiredId?: string): string =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <AuthFormLogin expiredId={expiredId} onSuccess={() => undefined} />
    </QueryClientProvider>,
  )

describe('AuthFormLogin', () => {
  it('com a sessão expirada, o aviso fica no formulário com o id que descreve o modal', () => {
    expect(render('aviso-expirado')).toContain(
      '<p id="aviso-expirado" role="status" class="text-warning text-center text-sm">Sua sessão expirou. Entre novamente para continuar.</p>',
    )
  })

  it('sem expiração, não há aviso', () => {
    expect(render()).not.toContain('Sua sessão expirou')
  })
})
