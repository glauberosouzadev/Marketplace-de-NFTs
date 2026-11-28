import { describe, expect, it } from 'vitest'
import { AVATAR_MAX_BYTES, validateAvatarFile } from './avatar-rules'

describe('validateAvatarFile', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('aceita %s', (type) => {
    expect(validateAvatarFile({ type, size: 10 })).toBeNull()
  })

  it('rejeita tipos fora da lista', () => {
    expect(validateAvatarFile({ type: 'image/gif', size: 10 })).toMatch(/PNG, JPEG ou WebP/)
    expect(validateAvatarFile({ type: 'text/plain', size: 10 })).not.toBeNull()
  })

  it('aceita exatamente 2 MB e rejeita 1 byte a mais', () => {
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES })).toBeNull()
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toMatch(/2 MB/)
  })
})
