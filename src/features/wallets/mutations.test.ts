import { MutationObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { ApiError, UpsertWalletRequest, WalletsResponse } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import {
  createWalletConnectionMutation,
  deleteWalletConnectionMutation,
  upsertWalletMutation,
} from './mutations'

const wallets: WalletsResponse = { primary: null, secondary: null }
const upsertBody: UpsertWalletRequest = {
  displayName: 'Ana',
  nickname: 'Principal',
  profileName: 'ana',
  email: 'ana@kurio.test',
  provider: 'metamask',
  network: 'ethereum',
  address: '0xabc',
  ensName: 'ana.eth',
}

beforeEach(() => {
  request.mockReset()
})

function seeded() {
  const client = createQueryClient()
  client.setQueryData(queryKeys.wallets('u-1'), wallets)
  client.setQueryData(queryKeys.wallets('u-2'), wallets)
  return client
}

describe('mutations de carteira', () => {
  const cases = [
    ['upsertWallet', upsertWalletMutation, { slot: 'primary', body: upsertBody }],
    [
      'createWalletConnection',
      createWalletConnectionMutation,
      { walletId: 'w1', provider: 'metamask', network: 'ethereum' },
    ],
    ['deleteWalletConnection', deleteWalletConnectionMutation, 'c1'],
  ] as const

  it.each(cases)('%s invalida só as carteiras do usuário', async (_n, factory, vars) => {
    request.mockResolvedValue({})
    const client = seeded()
    const observer = new MutationObserver(client, factory(client, 'u-1') as never)
    await observer.mutate(vars as never)
    expect(request).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(queryKeys.wallets('u-1'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(queryKeys.wallets('u-2'))?.isInvalidated).toBe(false)
  })

  it('upsertWallet com slot secondary usa PUT /me/wallets/secondary', async () => {
    request.mockResolvedValue({})
    const client = seeded()
    const observer = new MutationObserver(client, upsertWalletMutation(client, 'u-1') as never)
    await observer.mutate({ slot: 'secondary', body: upsertBody } as never)
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', url: '/me/wallets/secondary' }),
    )
  })

  it('422 chega com fieldErrors, sem retry e sem invalidar', async () => {
    const invalid: ApiError = {
      kind: 'http',
      status: 422,
      code: 'VALIDATION',
      message: 'inválido',
      fieldErrors: { address: 'Endereço inválido' },
    }
    request.mockRejectedValue(invalid)
    const client = seeded()
    const observer = new MutationObserver(client, upsertWalletMutation(client, 'u-1'))
    await expect(observer.mutate({ slot: 'primary', body: upsertBody })).rejects.toMatchObject({
      fieldErrors: { address: 'Endereço inválido' },
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(queryKeys.wallets('u-1'))?.isInvalidated).toBe(false)
  })
})
