import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { ProfileResponse, UpdateProfileRequest, UploadAvatarRequest, User } from '@/contracts'
import { deleteAvatar, updateProfile, uploadAvatar } from '@/http/endpoints/profile'

/** Mantém menu do usuário coerente sem novo login; só toca a sessão já carregada. */
function patchSessionUser(
  client: QueryClient,
  uid: string,
  patch: Partial<User>,
  avatarUrl?: string,
): void {
  client.setQueryData<User | null>(queryKeys.session(), (user) => {
    // Outro usuário pode ter entrado antes da resposta (RN-12/NFR-09).
    if (!user || user.id !== uid) return user
    const next: User = { ...user, ...patch }
    delete next.avatarUrl
    if (avatarUrl) next.avatarUrl = avatarUrl
    return next
  })
}

/** Perfil e carteiras compartilham o apelido da carteira (Q-09). */
function invalidateProfileAndWallets(client: QueryClient, uid: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.profile(uid) }),
    client.invalidateQueries({ queryKey: queryKeys.wallets(uid) }),
  ])
}

export const updateProfileMutation = (client: QueryClient, uid: string) => ({
  mutationFn: (body: UpdateProfileRequest) => updateProfile(body),
  retry: 0,
  onSuccess: (profile: ProfileResponse) => {
    client.setQueryData(queryKeys.profile(uid), profile)
    patchSessionUser(
      client,
      uid,
      {
        displayName: profile.displayName,
        username: profile.username,
        email: profile.email,
        ensName: profile.ensName,
      },
      profile.avatarUrl,
    )
    return invalidateProfileAndWallets(client, uid)
  },
})

export const uploadAvatarMutation = (client: QueryClient, uid: string) => ({
  mutationFn: (vars: UploadAvatarRequest) => uploadAvatar(vars),
  retry: 0,
  onSuccess: ({ avatarUrl }: { avatarUrl: string }) => {
    patchSessionUser(client, uid, {}, avatarUrl)
    return invalidateProfileAndWallets(client, uid)
  },
})

export const removeAvatarMutation = (client: QueryClient, uid: string) => ({
  mutationFn: () => deleteAvatar(),
  retry: 0,
  onSuccess: () => {
    patchSessionUser(client, uid, {})
    return invalidateProfileAndWallets(client, uid)
  },
})

export const useUpdateProfile = (uid: string) =>
  useMutation(updateProfileMutation(useQueryClient(), uid))
export const useUploadAvatar = (uid: string) =>
  useMutation(uploadAvatarMutation(useQueryClient(), uid))
export const useRemoveAvatar = (uid: string) =>
  useMutation(removeAvatarMutation(useQueryClient(), uid))
