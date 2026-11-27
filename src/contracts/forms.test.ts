import { describe, expect, it } from 'vitest'
import { loginSchema, PASSWORD_POLICY_MESSAGE, registerSchema } from './forms'

const valid = {
  username: 'ana',
  email: 'ana@email.com',
  password: 'abcdefg1',
  confirmPassword: 'abcdefg1',
}

const messages = (input: unknown) => {
  const result = registerSchema.safeParse(input)
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]))
}

describe('registerSchema', () => {
  it('aceita dados válidos', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it.each(['abc1', 'abcdefgh', '12345678'])(
    'rejeita senha fora da política Q-27: %s',
    (password) => {
      expect(messages({ ...valid, password, confirmPassword: password }).password).toBe(
        PASSWORD_POLICY_MESSAGE,
      )
    },
  )

  it('aceita exatamente 8 caracteres com letra e número', () => {
    expect(
      registerSchema.safeParse({ ...valid, password: 'abcdef12', confirmPassword: 'abcdef12' })
        .success,
    ).toBe(true)
  })

  it('exige confirmação igual, apontando para o campo de confirmação', () => {
    expect(messages({ ...valid, confirmPassword: 'abcdefg2' }).confirmPassword).toBe(
      'As senhas não conferem',
    )
  })

  it('valida formato de e-mail e usuário obrigatório', () => {
    const result = messages({ ...valid, email: 'ana@', username: '  ' })
    expect(result.email).toBe('Digite um e-mail válido')
    expect(result.username).toBe('Informe um nome de usuário')
  })
})

describe('loginSchema', () => {
  it('exige e-mail válido e senha', () => {
    const result = loginSchema.safeParse({ email: 'x', password: '' })
    expect(result.success).toBe(false)
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
  })
})
