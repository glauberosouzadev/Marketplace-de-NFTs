import type { FieldErrors } from '@/contracts'
import { mutateDb, nextVersion } from './store'

export const AVATAR_MAX_BYTES = 2_097_152
export const AVATAR_MAX_SIDE = 256
const ACCEPTED_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp']

export type ResizeAvatar = (file: Blob) => Promise<string>

/** Reduz para 256 px (lado maior) em WebP e devolve o data URL; só roda no navegador. */
export const resizeAvatar: ResizeAvatar = async (file) => {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp')
}

/** Valida o campo `file` do multipart (ausência, tipo e tamanho). */
export function validateAvatarFile(file: unknown): FieldErrors {
  if (!(file instanceof Blob)) return { file: 'Selecione uma imagem' }
  if (!ACCEPTED_TYPES.includes(file.type)) return { file: 'Use uma imagem PNG, JPEG ou WebP' }
  if (file.size > AVATAR_MAX_BYTES) return { file: 'A imagem deve ter no máximo 2 MB' }
  return {}
}

export type AvatarUpdate = { ok: true; avatarUrl: string } | { ok: false; fieldErrors: FieldErrors }

/** Persiste o data URL reduzido em `User.avatarUrl`; inválido não altera o avatar atual. */
export async function setAvatar(
  userId: string,
  file: unknown,
  resize: ResizeAvatar = resizeAvatar,
): Promise<AvatarUpdate> {
  const fieldErrors = validateAvatarFile(file)
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  let avatarUrl: string
  try {
    avatarUrl = await resize(file as Blob)
  } catch {
    return { ok: false, fieldErrors: { file: 'Não foi possível ler a imagem' } }
  }
  mutateDb((db) => {
    const user = db.users.find((u) => u.id === userId)
    if (!user) return
    user.avatarUrl = avatarUrl
    user.version = nextVersion(user.version)
  })
  return { ok: true, avatarUrl }
}

/** Idempotente: sem avatar, não muda nada. */
export function removeAvatar(userId: string): void {
  mutateDb((db) => {
    const user = db.users.find((u) => u.id === userId)
    if (!user || user.avatarUrl === undefined) return
    delete user.avatarUrl
    user.version = nextVersion(user.version)
  })
}
