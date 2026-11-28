import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UpdateProfileRequest } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>().mockResolvedValue({})
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { changePassword, deleteAvatar, getProfile, updateProfile, uploadAvatar } from './profile'

const body: UpdateProfileRequest = {
  displayName: 'Ana',
  username: 'ana',
  email: 'ana@kurio.test',
  ensName: 'ana.eth',
  walletNickname: 'Principal',
}

beforeEach(() => {
  request.mockClear()
})

describe('endpoints de perfil', () => {
  it('GET /me/profile repassa o signal', async () => {
    const signal = new AbortController().signal
    await getProfile(signal)
    expect(request).toHaveBeenCalledWith({ method: 'GET', url: '/me/profile', signal })
  })

  it('PATCH /me/profile com o corpo do contrato', async () => {
    await updateProfile(body)
    expect(request).toHaveBeenCalledWith({ method: 'PATCH', url: '/me/profile', data: body })
  })

  it('PUT /me/avatar envia multipart com o campo file', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await uploadAvatar({ file })
    const config = request.mock.calls[0]![0] as {
      method: string
      url: string
      data: FormData
      headers: Record<string, string>
    }
    expect(config.method).toBe('PUT')
    expect(config.url).toBe('/me/avatar')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
    expect((config.data.get('file') as File).name).toBe('a.png')
  })

  it('DELETE /me/avatar e POST /me/password', async () => {
    await deleteAvatar()
    expect(request).toHaveBeenCalledWith({ method: 'DELETE', url: '/me/avatar' })
    const pw = { currentPassword: 'a', newPassword: 'b' }
    await changePassword(pw)
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/me/password', data: pw })
  })
})
