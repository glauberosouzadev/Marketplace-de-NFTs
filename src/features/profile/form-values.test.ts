import { describe, expect, it, vi } from 'vitest'
import type { ApiError, Profile } from '@/contracts'
import { applyApiError } from '@/features/session/form-errors'
import {
  PROFILE_FORM_FIELDS,
  profileToFormValues,
  toPasswordChange,
  toUpdateRequest,
} from './form-values'

const profile: Profile = {
  displayName: 'Ana',
  username: 'ana',
  email: 'ana@email.com',
  ensName: 'ana.eth',
  walletNickname: 'Principal',
}

describe('form-values', () => {
  it('pré-preenche sem o sufixo .eth e com o apelido da carteira', () => {
    expect(profileToFormValues(profile)).toMatchObject({
      ensName: 'ana',
      walletNickname: 'Principal',
    })
  })

  it('senha começa vazia e fica fora do PATCH', () => {
    const values = profileToFormValues(profile)
    expect(values).toMatchObject({ currentPassword: '', newPassword: '', confirmPassword: '' })
    expect(toUpdateRequest({ ...values, newPassword: 'novaSenha1' })).not.toHaveProperty(
      'newPassword',
    )
  })

  it('toPasswordChange: null sem senha; atual e nova quando preenchidas', () => {
    const values = profileToFormValues(profile)
    expect(toPasswordChange(values)).toBeNull()
    const filled = {
      currentPassword: 'a1234567',
      newPassword: 'b1234567',
      confirmPassword: 'b1234567',
    }
    expect(toPasswordChange({ ...values, ...filled })).toEqual({
      currentPassword: 'a1234567',
      newPassword: 'b1234567',
    })
  })

  it('monta o pedido com o nome ENS completo e campos aparados', () => {
    const body = toUpdateRequest({ ...profileToFormValues(profile), displayName: ' Ana B ' })
    expect(body).toEqual({ ...profile, displayName: 'Ana B' })
  })

  it('409 vai ao campo de e-mail e o foco segue o primeiro inválido', () => {
    const form = { setError: vi.fn(), setFocus: vi.fn() }
    const error: ApiError = {
      kind: 'http',
      status: 409,
      code: 'EMAIL_TAKEN',
      message: 'x',
      fieldErrors: { email: 'E-mail já cadastrado' },
    }
    expect(applyApiError(form, error, PROFILE_FORM_FIELDS)).toBeNull()
    expect(form.setError).toHaveBeenCalledWith('email', expect.objectContaining({ type: 'server' }))
    expect(form.setFocus).toHaveBeenCalledWith('email')
  })
})
