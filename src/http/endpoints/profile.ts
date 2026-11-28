import { request } from '@/http/client'
import type {
  AvatarResponse,
  ChangePasswordRequest,
  ProfileResponse,
  UpdateProfileRequest,
  UploadAvatarRequest,
} from '@/contracts'

export function getProfile(signal: AbortSignal): Promise<ProfileResponse> {
  return request<ProfileResponse>({ method: 'GET', url: '/me/profile', signal })
}

export function updateProfile(body: UpdateProfileRequest): Promise<ProfileResponse> {
  return request<ProfileResponse>({ method: 'PATCH', url: '/me/profile', data: body })
}

/** O cliente fixa JSON por padrão; sem sobrescrever, o axios serializaria o FormData como JSON. */
export function uploadAvatar({ file }: UploadAvatarRequest): Promise<AvatarResponse> {
  const data = new FormData()
  data.append('file', file)
  return request<AvatarResponse>({
    method: 'PUT',
    url: '/me/avatar',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteAvatar(): Promise<void> {
  return request<void>({ method: 'DELETE', url: '/me/avatar' })
}

export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return request<void>({ method: 'POST', url: '/me/password', data: body })
}
