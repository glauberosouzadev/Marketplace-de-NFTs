import { describe, expect, it, vi } from 'vitest'
import type { ApiError } from '@/contracts'
import { applyApiError } from './form-errors'

type Values = { username: string; email: string; password: string }
const fields = ['username', 'email', 'password'] as const

const httpError = (
  status: number,
  code: ApiError['code'],
  fieldErrors?: Record<string, string>,
): ApiError => ({
  kind: 'http',
  status,
  code,
  message: 'x',
  ...(fieldErrors ? { fieldErrors } : {}),
})

function setup(error: unknown) {
  const form = { setError: vi.fn(), setFocus: vi.fn() }
  const general = applyApiError<Values>(form, error, fields)
  return { form, general }
}

describe('applyApiError', () => {
  it('409 aparece no campo e leva o foco ao primeiro inválido', () => {
    const { form, general } = setup(
      httpError(409, 'EMAIL_TAKEN', {
        email: 'E-mail já cadastrado',
        username: 'Usuário já em uso',
      }),
    )
    expect(general).toBeNull()
    expect(form.setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Este e-mail já está em uso.',
    })
    expect(form.setError).toHaveBeenCalledWith('username', {
      type: 'server',
      message: 'Este nome de usuário já está em uso.',
    })
    expect(form.setFocus).toHaveBeenCalledWith('username')
  })

  it('422 usa o texto do campo vindo da API', () => {
    const { form } = setup(httpError(422, 'VALIDATION', { password: 'Senha fraca' }))
    expect(form.setError).toHaveBeenCalledWith('password', {
      type: 'server',
      message: 'Senha fraca',
    })
  })

  it('401 vira mensagem geral, sem tocar nos campos', () => {
    const { form, general } = setup(httpError(401, 'INVALID_CREDENTIALS'))
    expect(general).toBe('E-mail ou senha incorretos.')
    expect(form.setError).not.toHaveBeenCalled()
    expect(form.setFocus).not.toHaveBeenCalled()
  })

  it('erro desconhecido vira mensagem transitória', () => {
    expect(setup(new Error('boom')).general).toBe('Algo deu errado. Tente novamente.')
  })
})
