import { http, HttpResponse } from 'msw'
import type { FieldErrors, ProfileResponse } from '@/contracts'
import { changePassword, getProfile, updateProfile, validateProfile } from '../../db/profile'
import { apiUrl, errorResponse, resolveSession, sessionError, withScenario } from '../util'
import { readBody } from './cart'

const validation = (fieldErrors: FieldErrors): Response =>
  errorResponse(422, 'VALIDATION', 'Corpo inválido', fieldErrors)

const password = (value: unknown): string => (typeof value === 'string' ? value : '')

export const profileHandlers = [
  http.get(
    apiUrl('/me/profile'),
    withScenario('GET /me/profile', ({ request }) => {
      const auth = resolveSession(request)
      if (!auth) return sessionError(request)
      const body: ProfileResponse | null = getProfile(auth.user.id)
      return body ? HttpResponse.json(body) : sessionError(request)
    }),
  ),
  http.patch(
    apiUrl('/me/profile'),
    withScenario('PATCH /me/profile', async ({ request }) => {
      const auth = resolveSession(request)
      if (!auth) return sessionError(request)
      const validated = validateProfile(await readBody(request))
      if (!validated.ok) return validation(validated.fieldErrors)
      const result = updateProfile(auth.user.id, validated.value)
      if (result.ok) return HttpResponse.json<ProfileResponse>(result.profile)
      if ('conflict' in result) {
        const { code, fieldErrors } = result.conflict
        const message = code === 'EMAIL_TAKEN' ? 'E-mail já cadastrado' : 'Usuário já em uso'
        return errorResponse(409, code, message, fieldErrors)
      }
      return validation(result.fieldErrors)
    }),
  ),
  http.post(
    apiUrl('/me/password'),
    withScenario('POST /me/password', async ({ request }) => {
      const auth = resolveSession(request)
      if (!auth) return sessionError(request)
      const body = await readBody(request)
      const fieldErrors = await changePassword(
        auth.user.id,
        password(body.currentPassword),
        password(body.newPassword),
      )
      if (Object.keys(fieldErrors).length > 0) return validation(fieldErrors)
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
