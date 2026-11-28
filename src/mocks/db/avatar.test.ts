import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AVATAR_MAX_BYTES, removeAvatar, setAvatar, validateAvatarFile } from './avatar'
import { getDb, resetDb } from './store'

const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'a', { type })
const resize = vi.fn(async () => 'data:image/webp;base64,AAAA')
const avatarOf = (id: string) => getDb().users.find((u) => u.id === id)?.avatarUrl

beforeEach(() => {
  resetDb()
  resize.mockClear()
})

describe('avatar no banco simulado', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('aceita %s', (type) => {
    expect(validateAvatarFile(file(type))).toEqual({})
  })

  it('rejeita ausência, tipo fora da lista e arquivo acima de 2 MB', () => {
    expect(validateAvatarFile(null).file).toBeDefined()
    expect(validateAvatarFile(file('image/gif')).file).toBeDefined()
    expect(validateAvatarFile(file('text/plain')).file).toBeDefined()
    expect(validateAvatarFile(file('image/png', AVATAR_MAX_BYTES)).file).toBeUndefined()
    expect(validateAvatarFile(file('image/png', AVATAR_MAX_BYTES + 1)).file).toBeDefined()
  })

  it('persiste o valor reduzido e sobe a versão', async () => {
    const before = getDb().users.find((u) => u.id === 'user-001')?.version
    const result = await setAvatar('user-001', file('image/png'), resize)
    expect(result).toEqual({ ok: true, avatarUrl: 'data:image/webp;base64,AAAA' })
    expect(avatarOf('user-001')).toBe('data:image/webp;base64,AAAA')
    expect(getDb().users.find((u) => u.id === 'user-001')?.version).not.toBe(before)
  })

  it('inválido não chama a redução nem altera o avatar atual', async () => {
    await setAvatar('user-001', file('image/png'), resize)
    resize.mockClear()
    const result = await setAvatar('user-001', file('image/gif'), resize)
    expect(result.ok).toBe(false)
    expect(resize).not.toHaveBeenCalled()
    expect(avatarOf('user-001')).toBe('data:image/webp;base64,AAAA')
  })

  it('falha na redução (imagem corrompida) vira erro no campo sem alterar o avatar', async () => {
    await setAvatar('user-001', file('image/png'), resize)
    const version = getDb().users.find((u) => u.id === 'user-001')?.version
    const broken = vi.fn(async (): Promise<string> => {
      throw new Error('decode')
    })
    const result = await setAvatar('user-001', file('image/png'), broken)
    expect(result.ok === false && result.fieldErrors.file).toBeDefined()
    expect(avatarOf('user-001')).toBe('data:image/webp;base64,AAAA')
    expect(getDb().users.find((u) => u.id === 'user-001')?.version).toBe(version)
  })

  it('remoção é idempotente e isolada por usuário', async () => {
    await setAvatar('user-001', file('image/png'), resize)
    await setAvatar('user-002', file('image/png'), resize)
    removeAvatar('user-001')
    removeAvatar('user-001')
    expect(avatarOf('user-001')).toBeUndefined()
    expect(avatarOf('user-002')).toBeDefined()
  })
})
