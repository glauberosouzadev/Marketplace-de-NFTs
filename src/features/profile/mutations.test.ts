import { MutationObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { ApiError, Profile, User } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { removeAvatarMutation, updateProfileMutation, uploadAvatarMutation } from './mutations'

const user: User = {
  id: 'u-1',
  username: 'ana',
  email: 'ana@kurio.test',
  displayName: 'Ana',
  ensName: 'ana.eth',
  avatarUrl: 'old.png',
  version: 1,
}
const profile: Profile = {
  displayName: 'Ana B',
  username: 'anab',
  email: 'anab@kurio.test',
  ensName: 'anab.eth',
  walletNickname: 'Nova',
  avatarUrl: 'old.png',
}

beforeEach(() => {
  request.mockReset()
})

function seeded() {
  const client = createQueryClient()
  client.setQueryData(queryKeys.session(), user)
  client.setQueryData(queryKeys.profile('u-1'), {})
  client.setQueryData(queryKeys.wallets('u-1'), {})
  client.setQueryData(queryKeys.wallets('u-2'), {})
  return client
}

describe('mutations de perfil', () => {
  it('updateProfile atualiza perfil e sessão e invalida carteiras', async () => {
    request.mockResolvedValue(profile)
    const client = seeded()
    const observer = new MutationObserver(client, updateProfileMutation(client, 'u-1'))
    await observer.mutate({ ...profile })
    expect(client.getQueryData(queryKeys.profile('u-1'))).toEqual(profile)
    expect(client.getQueryData<User>(queryKeys.session())).toMatchObject({
      id: 'u-1',
      displayName: 'Ana B',
      username: 'anab',
      version: 1,
    })
    expect(client.getQueryState(queryKeys.wallets('u-1'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(queryKeys.wallets('u-2'))?.isInvalidated).toBe(false)
  })

  it('uploadAvatar atualiza o avatar da sessão e invalida perfil e carteiras', async () => {
    request.mockResolvedValue({ avatarUrl: 'new.png' })
    const client = seeded()
    const observer = new MutationObserver(client, uploadAvatarMutation(client, 'u-1'))
    await observer.mutate({ file: new Blob(['x']) })
    expect(client.getQueryData<User>(queryKeys.session())?.avatarUrl).toBe('new.png')
    expect(client.getQueryState(queryKeys.profile('u-1'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(queryKeys.wallets('u-1'))?.isInvalidated).toBe(true)
  })

  it('removeAvatar limpa o avatar da sessão', async () => {
    request.mockResolvedValue(undefined)
    const client = seeded()
    const observer = new MutationObserver(client, removeAvatarMutation(client, 'u-1'))
    await observer.mutate()
    expect(client.getQueryData<User>(queryKeys.session())?.avatarUrl).toBeUndefined()
    expect(client.getQueryState(queryKeys.profile('u-1'))?.isInvalidated).toBe(true)
  })

  it('sem sessão carregada não cria usuário', async () => {
    request.mockResolvedValue({ avatarUrl: 'new.png' })
    const client = createQueryClient()
    const observer = new MutationObserver(client, uploadAvatarMutation(client, 'u-1'))
    await observer.mutate({ file: new Blob(['x']) })
    expect(client.getQueryData(queryKeys.session())).toBeUndefined()
  })

  it('sessão de outro usuário não é alterada pela resposta tardia', async () => {
    request.mockResolvedValue(profile)
    const client = seeded()
    const other: User = { ...user, id: 'u-2', displayName: 'Beto' }
    client.setQueryData(queryKeys.session(), other)
    const observer = new MutationObserver(client, updateProfileMutation(client, 'u-1'))
    await observer.mutate({ ...profile })
    expect(client.getQueryData<User>(queryKeys.session())).toEqual(other)
  })

  it('409 preserva fieldErrors, sem retry e sem tocar o cache', async () => {
    const conflict: ApiError = {
      kind: 'http',
      status: 409,
      code: 'EMAIL_TAKEN',
      message: 'conflito',
      fieldErrors: { email: 'E-mail já cadastrado' },
    }
    request.mockRejectedValue(conflict)
    const client = seeded()
    const observer = new MutationObserver(client, updateProfileMutation(client, 'u-1'))
    await expect(observer.mutate({ ...profile })).rejects.toMatchObject({
      fieldErrors: { email: 'E-mail já cadastrado' },
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(queryKeys.profile('u-1'))?.isInvalidated).toBe(false)
  })
})
