import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { getSession, login, logout, register } from './auth'

beforeEach(() => {
  request.mockReset()
  request.mockResolvedValue({})
})

describe('endpoints de auth', () => {
  it('POST /auth/register com o corpo do contrato', async () => {
    const body = { username: 'ana', email: 'a@k.io', password: 'x', guestCartId: 'g-1' }
    await register(body)
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/auth/register', data: body })
  })

  it('POST /auth/login com o corpo do contrato', async () => {
    const body = { email: 'a@k.io', password: 'x', guestCartId: 'g-1' }
    await login(body)
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/auth/login', data: body })
  })

  it('GET /auth/session repassa o signal', async () => {
    const signal = new AbortController().signal
    await getSession(signal)
    expect(request).toHaveBeenCalledWith({ method: 'GET', url: '/auth/session', signal })
  })

  it('POST /auth/logout sem corpo', async () => {
    await logout()
    expect(request).toHaveBeenCalledWith({ method: 'POST', url: '/auth/logout' })
  })
})
