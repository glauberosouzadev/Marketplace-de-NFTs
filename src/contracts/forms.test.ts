import { describe, expect, it } from 'vitest'
import { loginSchema, PASSWORD_POLICY_MESSAGE, profileSchema, registerSchema } from './forms'

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

describe('profileSchema', () => {
  const profile = {
    displayName: 'Ana',
    username: 'ana',
    email: 'ana@email.com',
    ensName: 'ana',
    walletNickname: 'Principal',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
  const passwords = {
    currentPassword: 'antiga123',
    newPassword: 'novaSenha1',
    confirmPassword: 'novaSenha1',
  }
  const issues = (input: unknown) => {
    const result = profileSchema.safeParse(input)
    return result.success
      ? {}
      : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]))
  }

  it('aceita dados válidos', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true)
  })

  it('exige todos os campos', () => {
    const empty = { displayName: ' ', username: '', email: '', ensName: '', walletNickname: '' }
    expect(Object.keys(issues({ ...profile, ...empty }))).toEqual(Object.keys(empty))
    expect(issues({ ...profile, ...empty }).displayName).toBe('Campo obrigatório')
  })

  it('rejeita e-mail inválido', () => {
    expect(issues({ ...profile, email: 'ana@' })).toEqual({ email: 'Digite um e-mail válido' })
  })

  it('aceita troca de senha completa e válida', () => {
    expect(profileSchema.safeParse({ ...profile, ...passwords }).success).toBe(true)
  })

  it('preencher parte da senha exige os três campos', () => {
    expect(issues({ ...profile, newPassword: 'novaSenha1' })).toEqual({
      currentPassword: 'Informe a senha atual',
      confirmPassword: 'Confirme a nova senha',
    })
    expect(issues({ ...profile, currentPassword: 'antiga123' })).toEqual({
      newPassword: 'Informe a nova senha',
      confirmPassword: 'Confirme a nova senha',
    })
  })

  it('aplica a política Q-27 à nova senha', () => {
    const weak = { ...passwords, newPassword: 'abcdefgh', confirmPassword: 'abcdefgh' }
    expect(issues({ ...profile, ...weak })).toEqual({ newPassword: PASSWORD_POLICY_MESSAGE })
  })

  it('nova senha igual à atual é rejeitada', () => {
    const same = {
      currentPassword: 'antiga123',
      newPassword: 'antiga123',
      confirmPassword: 'antiga123',
    }
    expect(issues({ ...profile, ...same })).toEqual({
      newPassword: 'A nova senha deve ser diferente da atual',
    })
  })

  it('confirmação diferente aponta para o campo de confirmação', () => {
    expect(issues({ ...profile, ...passwords, confirmPassword: 'outraSenha1' })).toEqual({
      confirmPassword: 'As senhas não conferem',
    })
  })

  it('valida a senha mesmo com erro nos dados do perfil', () => {
    expect(issues({ ...profile, ...passwords, email: 'ana@', confirmPassword: 'x1' })).toEqual({
      email: 'Digite um e-mail válido',
      confirmPassword: 'As senhas não conferem',
    })
  })
})
