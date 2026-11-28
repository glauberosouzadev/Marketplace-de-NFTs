import { useCallback, useState } from 'react'
import type { ChangePasswordRequest, UpdateProfileRequest } from '@/contracts'
import type { ProfileFormValues } from '@/contracts/forms'
import { changePassword } from '@/http/endpoints/profile'
import { toPasswordChange, toUpdateRequest } from './form-values'
import { useUpdateProfile } from './mutations'

export type SaveOutcome =
  | { status: 'saved'; passwordChanged: boolean }
  | { status: 'profile-failed'; error: unknown }
  | { status: 'password-failed'; error: unknown }

export interface SaveProfileDeps {
  updateProfile: (body: UpdateProfileRequest) => Promise<unknown>
  changePassword: (body: ChangePasswordRequest) => Promise<void>
}

/** PATCH do perfil primeiro; a senha só vai se ele passou e algum campo dela foi preenchido. */
export async function saveProfile(
  values: ProfileFormValues,
  deps: SaveProfileDeps,
): Promise<SaveOutcome> {
  try {
    await deps.updateProfile(toUpdateRequest(values))
  } catch (error) {
    return { status: 'profile-failed', error }
  }
  const passwordChange = toPasswordChange(values)
  if (!passwordChange) return { status: 'saved', passwordChanged: false }
  try {
    await deps.changePassword(passwordChange)
  } catch (error) {
    return { status: 'password-failed', error }
  }
  return { status: 'saved', passwordChanged: true }
}

/**
 * A senha vai direto ao endpoint, fora do `useMutation`: assim ela não fica nas
 * `variables` do MutationCache (RN-15).
 */
export function useSaveProfile(uid: string) {
  const { mutateAsync: updateProfile } = useUpdateProfile(uid)
  const [isPending, setPending] = useState(false)

  const save = useCallback(
    async (values: ProfileFormValues) => {
      setPending(true)
      try {
        return await saveProfile(values, { updateProfile, changePassword })
      } finally {
        setPending(false)
      }
    },
    [updateProfile],
  )

  return { save, isPending }
}
