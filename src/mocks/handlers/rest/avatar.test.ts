import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AvatarResponse, ErrorEnvelope, Profile, SessionResponse } from '@/contracts'
import { AVATAR_MAX_BYTES } from '../../db/avatar'
import { mutateDb, resetDb } from '../../db/store'
import { activateScenario } from '../../scenarios/active'
import { apiUrl } from '../util'
import { createAvatarHandlers } from './avatar'
import { profileHandlers } from './profile'
import { authHandlers } from './auth'

vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/v1'))

const URL_OUT = 'data:image/webp;base64,AAAA'
const server = setupServer(
  ...createAvatarHandlers(async () => URL_OUT),
  ...profileHandlers,
  ...authHandlers,
)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  resetDb()
  activateScenario('default')
  mutateDb((db) => {
    const expiresAt = '2999-01-01T00:00:00.000Z'
    db.sessions.push(
      { token: 'tok-ana', userId: 'user-001', expiresAt },
      { token: 'tok-bruno', userId: 'user-002', expiresAt },
    )
  })
})

const headers = (token?: string): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {}
const put = (token: string | undefined, file?: File) => {
  const form = new FormData()
  if (file) form.append('file', file)
  return fetch(apiUrl('/me/avatar'), { method: 'PUT', headers: headers(token), body: form })
}
const del = (token?: string) =>
  fetch(apiUrl('/me/avatar'), { method: 'DELETE', headers: headers(token) })
const profileOf = async (token: string) =>
  (await (await fetch(apiUrl('/me/profile'), { headers: headers(token) })).json()) as Profile
const png = (size = 10) => new File([new Uint8Array(size)], 'a.png', { type: 'image/png' })

describe('PUT /me/avatar', () => {
  it('aceita imagem válida e devolve o avatarUrl, visível no perfil', async () => {
    const res = await put('tok-ana', png())
    expect(res.status).toBe(200)
    expect(((await res.json()) as AvatarResponse).avatarUrl).toBe(URL_OUT)
    expect((await profileOf('tok-ana')).avatarUrl).toBe(URL_OUT)
    expect((await profileOf('tok-bruno')).avatarUrl).toBeUndefined()
  })

  it('devolve 422 com fieldErrors.file para GIF, grande demais ou sem arquivo', async () => {
    await put('tok-ana', png())
    const gif = new File([new Uint8Array(4)], 'a.gif', { type: 'image/gif' })
    for (const file of [gif, png(AVATAR_MAX_BYTES + 1), undefined]) {
      const res = await put('tok-ana', file)
      expect(res.status).toBe(422)
      const body = (await res.json()) as ErrorEnvelope
      expect(body.code).toBe('VALIDATION')
      expect(body.fieldErrors?.file).toBeDefined()
    }
    expect((await profileOf('tok-ana')).avatarUrl).toBe(URL_OUT)
  })

  it('exige sessão', async () => {
    expect((await put(undefined, png())).status).toBe(401)
  })
})

describe('DELETE /me/avatar', () => {
  it('remove do perfil e da sessão, e repetir também devolve 204', async () => {
    await put('tok-ana', png())
    expect((await del('tok-ana')).status).toBe(204)
    expect((await del('tok-ana')).status).toBe(204)
    expect((await profileOf('tok-ana')).avatarUrl).toBeUndefined()
    const session = (await (
      await fetch(apiUrl('/auth/session'), { headers: headers('tok-ana') })
    ).json()) as SessionResponse
    expect(session.user.avatarUrl).toBeUndefined()
  })
})
