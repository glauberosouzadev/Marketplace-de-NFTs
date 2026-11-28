import { http, HttpResponse } from 'msw'
import type { AvatarResponse } from '@/contracts'
import { removeAvatar, resizeAvatar, setAvatar, type ResizeAvatar } from '../../db/avatar'
import { apiUrl, errorResponse, resolveSession, sessionError, withScenario } from '../util'

const formFile = async (request: Request): Promise<unknown> => {
  const form = await request.formData().catch(() => null)
  return form?.get('file') ?? null
}

export const createAvatarHandlers = (resize: ResizeAvatar = resizeAvatar) => [
  http.put(
    apiUrl('/me/avatar'),
    withScenario('PUT /me/avatar', async ({ request }) => {
      const auth = resolveSession(request)
      if (!auth) return sessionError(request)
      const result = await setAvatar(auth.user.id, await formFile(request), resize)
      if (!result.ok) return errorResponse(422, 'VALIDATION', 'Imagem inválida', result.fieldErrors)
      return HttpResponse.json<AvatarResponse>({ avatarUrl: result.avatarUrl })
    }),
  ),
  http.delete(
    apiUrl('/me/avatar'),
    withScenario('DELETE /me/avatar', ({ request }) => {
      const auth = resolveSession(request)
      if (!auth) return sessionError(request)
      removeAvatar(auth.user.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]

export const avatarHandlers = createAvatarHandlers()
