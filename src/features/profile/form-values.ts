import type { ChangePasswordRequest, Profile, UpdateProfileRequest } from '@/contracts'
import type { ProfileFormValues } from '@/contracts/forms'

export const EMPTY_PASSWORD_FIELDS = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
} as const satisfies Partial<ProfileFormValues>

export const ENS_SUFFIX = '.eth'

/** Campos na ordem visual (coluna a coluna), usada para o foco em erros da API. */
export const PROFILE_FORM_FIELDS = [
  'displayName',
  'username',
  'email',
  'ensName',
  'walletNickname',
] as const satisfies readonly (keyof ProfileFormValues)[]

const ensLabelOf = (ensName: string): string =>
  ensName.endsWith(ENS_SUFFIX) ? ensName.slice(0, -ENS_SUFFIX.length) : ensName

export function profileToFormValues(profile: Profile): ProfileFormValues {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: ensLabelOf(profile.ensName),
    walletNickname: profile.walletNickname,
    ...EMPTY_PASSWORD_FIELDS,
  }
}

/** `null` quando nenhum campo de senha foi preenchido: só o perfil é enviado. */
export function toPasswordChange(values: ProfileFormValues): ChangePasswordRequest | null {
  if (!values.currentPassword && !values.newPassword) return null
  return { currentPassword: values.currentPassword, newPassword: values.newPassword }
}

/** `values` já passou por `profileSchema`; a API recebe o nome ENS completo. */
export function toUpdateRequest(values: ProfileFormValues): UpdateProfileRequest {
  return {
    displayName: values.displayName.trim(),
    username: values.username.trim(),
    email: values.email.trim(),
    ensName: `${values.ensName.trim()}${ENS_SUFFIX}`,
    walletNickname: values.walletNickname.trim(),
  }
}
