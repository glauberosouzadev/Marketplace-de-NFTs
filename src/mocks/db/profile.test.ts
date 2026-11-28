import { beforeEach, describe, expect, it } from 'vitest'
import { verifyPassword } from './password'
import { changePassword, getProfile, updateProfile, validateProfile } from './profile'
import { getDb, mutateDb, resetDb } from './store'

const ANA_PASSWORD = 'Kurio@2026'
const VALID = {
  displayName: 'Ana C.',
  username: 'ana.nova',
  email: 'ana.nova@kurio.test',
  ensName: 'ana-nova.eth',
  walletNickname: 'Cofre',
}

beforeEach(() => {
  resetDb()
})

describe('perfil no banco simulado', () => {
  it('getProfile lê o apelido da carteira principal ou devolve vazio sem ela', () => {
    expect(getProfile('user-001')?.walletNickname).toBe('Carteira principal')
    mutateDb((db) => {
      db.wallets = db.wallets.filter((w) => w.userId !== 'user-001')
    })
    expect(getProfile('user-001')?.walletNickname).toBe('')
  })

  it('validateProfile exige obrigatórios, e-mail válido e ENS .eth', () => {
    const empty = validateProfile({})
    expect(empty.ok ? {} : empty.fieldErrors).toEqual({
      displayName: 'Campo obrigatório',
      username: 'Campo obrigatório',
      email: 'Campo obrigatório',
      ensName: 'Campo obrigatório',
    })
    const bad = validateProfile({ ...VALID, email: 'x@', ensName: 'ana' })
    expect(bad.ok ? [] : Object.keys(bad.fieldErrors)).toEqual(['email', 'ensName'])
  })

  it('updateProfile grava o apelido só na carteira principal e sobe a versão', () => {
    const result = updateProfile('user-001', VALID)
    expect(result.ok && result.profile.walletNickname).toBe('Cofre')
    const db = getDb()
    const user = db.users.find((u) => u.id === 'user-001')
    expect(user?.version).toBe(2)
    expect(user).not.toHaveProperty('walletNickname')
    expect(db.wallets.find((w) => w.id === 'wallet-001')?.nickname).toBe('Cofre')
    expect(db.wallets.find((w) => w.id === 'wallet-002')?.nickname).not.toBe('Cofre')
  })

  it('updateProfile recusa e-mail ou usuário de outra conta sem diferenciar maiúsculas', () => {
    const result = updateProfile('user-001', {
      ...VALID,
      email: 'BRUNO@kurio.test',
      username: 'Bruno.Criador',
    })
    expect(!result.ok && 'conflict' in result && result.conflict).toEqual({
      code: 'EMAIL_TAKEN',
      fieldErrors: { email: 'E-mail já cadastrado', username: 'Usuário já em uso' },
    })
    expect(getDb().users.find((u) => u.id === 'user-001')?.version).toBe(1)
  })

  it('manter o próprio e-mail e usuário não é conflito', () => {
    const result = updateProfile('user-001', {
      ...VALID,
      email: 'ana@kurio.test',
      username: 'ana.colecionadora',
    })
    expect(result.ok).toBe(true)
  })

  it('apelido não vazio sem carteira principal vira erro no campo', () => {
    mutateDb((db) => {
      db.wallets = db.wallets.filter((w) => w.userId !== 'user-001')
    })
    const result = updateProfile('user-001', VALID)
    expect(!result.ok && 'fieldErrors' in result && result.fieldErrors).toEqual({
      walletNickname: 'Cadastre a carteira principal antes',
    })
    expect(updateProfile('user-001', { ...VALID, walletNickname: '' }).ok).toBe(true)
  })

  it('apelido vazio com carteira principal vira erro no campo sem alterar nada', () => {
    const result = updateProfile('user-001', { ...VALID, walletNickname: '' })
    expect(!result.ok && 'fieldErrors' in result && result.fieldErrors).toEqual({
      walletNickname: 'Campo obrigatório',
    })
    const db = getDb()
    expect(db.users.find((u) => u.id === 'user-001')?.version).toBe(1)
    expect(db.wallets.find((w) => w.id === 'wallet-001')?.nickname).toBe('Carteira principal')
  })
})

describe('troca de senha', () => {
  it('senha atual errada gera erro em currentPassword', async () => {
    expect(await changePassword('user-001', 'Errada123', 'Nova12345')).toEqual({
      currentPassword: 'Senha atual incorreta',
    })
  })

  it('nova senha fora da política ou igual à atual gera erro em newPassword', async () => {
    expect(Object.keys(await changePassword('user-001', ANA_PASSWORD, 'curta1'))).toEqual([
      'newPassword',
    ])
    expect(await changePassword('user-001', ANA_PASSWORD, ANA_PASSWORD)).toEqual({
      newPassword: 'A nova senha deve ser diferente da atual',
    })
  })

  it('troca grava só hash + salt novos', async () => {
    const before = structuredClone(getDb().users.find((u) => u.id === 'user-001')!)
    expect(await changePassword('user-001', ANA_PASSWORD, 'Nova12345')).toEqual({})
    const after = getDb().users.find((u) => u.id === 'user-001')!
    expect(after.salt).not.toBe(before.salt)
    expect(after.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    expect(await verifyPassword('Nova12345', after.salt, after.passwordHash)).toBe(true)
    expect(await verifyPassword(ANA_PASSWORD, after.salt, after.passwordHash)).toBe(false)
    const persisted = JSON.stringify(getDb())
    expect(persisted).not.toContain('Nova12345')
    expect(persisted).not.toContain(ANA_PASSWORD)
  })
})
