import { describe, expect, it, vi } from 'vitest'
import type { ApiError, ChangePasswordRequest, UpdateProfileRequest } from '@/contracts'
import type { ProfileFormValues } from '@/contracts/forms'
import { saveProfile } from './save-profile'

const base: ProfileFormValues = {
  displayName: 'Ana',
  username: 'ana',
  email: 'ana@email.com',
  ensName: 'ana',
  walletNickname: 'Principal',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}
const withPassword: ProfileFormValues = {
  ...base,
  currentPassword: 'antiga123',
  newPassword: 'novaSenha1',
  confirmPassword: 'novaSenha1',
}
const apiError = (status: number, fieldErrors: Record<string, string>): ApiError => ({
  kind: 'http',
  status,
  code: status === 409 ? 'EMAIL_TAKEN' : 'VALIDATION',
  message: 'erro',
  fieldErrors,
})

function setup() {
  const calls: string[] = []
  const updateProfile = vi.fn((body: UpdateProfileRequest) => {
    calls.push('PATCH /me/profile')
    return Promise.resolve(body)
  })
  const changePassword = vi.fn((body: ChangePasswordRequest) => {
    calls.push(`POST /me/password ${Object.keys(body).join(',')}`)
    return Promise.resolve()
  })
  return { calls, deps: { updateProfile, changePassword } }
}

describe('saveProfile', () => {
  it('sem senha preenchida: só o PATCH', async () => {
    const { calls, deps } = setup()
    await expect(saveProfile(base, deps)).resolves.toEqual({
      status: 'saved',
      passwordChanged: false,
    })
    expect(calls).toEqual(['PATCH /me/profile'])
    expect(deps.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ ensName: 'ana.eth' }))
  })

  it('com senha: PATCH e depois POST, sem a confirmação no corpo', async () => {
    const { calls, deps } = setup()
    await expect(saveProfile(withPassword, deps)).resolves.toEqual({
      status: 'saved',
      passwordChanged: true,
    })
    expect(calls).toEqual(['PATCH /me/profile', 'POST /me/password currentPassword,newPassword'])
    expect(deps.updateProfile.mock.calls[0]?.[0]).not.toHaveProperty('currentPassword')
  })

  it('PATCH com 409 não dispara o POST de senha', async () => {
    const { deps } = setup()
    const conflict = apiError(409, { email: 'E-mail já cadastrado' })
    deps.updateProfile.mockRejectedValueOnce(conflict)
    await expect(saveProfile(withPassword, deps)).resolves.toEqual({
      status: 'profile-failed',
      error: conflict,
    })
    expect(deps.changePassword).not.toHaveBeenCalled()
  })

  it('falha parcial: perfil salvo e erro da senha devolvido', async () => {
    const { calls, deps } = setup()
    const wrong = apiError(422, { currentPassword: 'Senha atual incorreta' })
    deps.changePassword.mockRejectedValueOnce(wrong)
    await expect(saveProfile(withPassword, deps)).resolves.toEqual({
      status: 'password-failed',
      error: wrong,
    })
    expect(calls[0]).toBe('PATCH /me/profile')
    expect(deps.updateProfile).toHaveBeenCalledTimes(1)
  })
})
