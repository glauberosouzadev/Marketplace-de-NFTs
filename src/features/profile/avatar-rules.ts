/** Regra Q-28 (PNG/JPEG/WebP até 2 MB); o servidor valida de novo. */
export const AVATAR_ACCEPTED_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp']
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ACCEPT = AVATAR_ACCEPTED_TYPES.join(',')

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) return 'Use uma imagem PNG, JPEG ou WebP'
  if (file.size > AVATAR_MAX_BYTES) return 'A imagem deve ter no máximo 2 MB'
  return null
}
