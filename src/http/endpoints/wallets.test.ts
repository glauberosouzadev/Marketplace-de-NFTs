import { describe, expect, it, vi } from 'vitest'
import type { UpsertWalletRequest } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>().mockResolvedValue({})
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { createWalletConnection, deleteWalletConnection, getWallets, upsertWallet } from './wallets'

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

describe('endpoints de carteiras', () => {
  it('GET /me/wallets repassa o signal', async () => {
    const signal = new AbortController().signal
    await getWallets(signal)
    expect(request).toHaveBeenCalledWith({ method: 'GET', url: '/me/wallets', signal })
  })

  it('PUT /me/wallets/:slot com o corpo do contrato', async () => {
    await upsertWallet('primary', upsertBody)
    expect(request).toHaveBeenCalledWith({
      method: 'PUT',
      url: '/me/wallets/primary',
      data: upsertBody,
    })
  })

  it('POST e DELETE de /wallet-connections', async () => {
    const body = { walletId: 'w1', provider: 'metamask', network: 'ethereum' } as const
    await createWalletConnection(body)
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/wallet-connections', data: body })
    await deleteWalletConnection('c 1')
    expect(request).toHaveBeenCalledWith({ method: 'DELETE', url: '/wallet-connections/c%201' })
  })
})
