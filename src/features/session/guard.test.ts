import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import type { User } from '@/contracts'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { type GuardContext, requireSession } from './guard'

const store = new Map<string, string>()
const user: User = {
  id: 'u-1',
  username: 'ana',
  email: 'a@k.io',
  displayName: 'Ana',
  ensName: 'ana.eth',
  version: 1,
}
const location = { href: '/pagamento?step=2' }

beforeEach(() => {
  request.mockReset()
  store.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  })
})

const caught = (context: GuardContext): Promise<unknown> =>
  requireSession(context, location).catch((e: unknown) => e)

function loginUrl(error: unknown): URL {
  expect(isRedirect(error)).toBe(true)
  return new URL((error as { options: { href: string } }).options.href, 'http://x')
}

describe('requireSession', () => {
  it('sem sessão lança redirect para /login com o href atual', async () => {
    const error: unknown = await requireSession(
      { queryClient: createQueryClient() },
      location,
    ).catch((e: unknown) => e)
    expect(isRedirect(error)).toBe(true)
    const href = (error as { options: { href: string } }).options.href
    const url = new URL(href, 'http://x')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/pagamento?step=2')
  })

  it('com sessão válida passa e não refaz a consulta enquanto fresca', async () => {
    store.set('kurio:session', JSON.stringify({ token: 'tok-1', uid: 'u-1' }))
    request.mockResolvedValue({ user, expiresAt: '2026-12-01T00:00:00Z' })
    const context = { queryClient: createQueryClient() }
    await expect(requireSession(context, location)).resolves.toEqual({ user })
    await expect(requireSession(context, location)).resolves.toEqual({ user })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['UNAUTHENTICATED', null],
    ['SESSION_EXPIRED', 'expired'],
  ] as const)('401 %s redireciona para o login (reason=%s)', async (code, reason) => {
    store.set('kurio:session', JSON.stringify({ token: 'tok-1', uid: 'u-1' }))
    request.mockRejectedValue({ kind: 'http', status: 401, code, message: 'x' })
    const url = loginUrl(await caught({ queryClient: createQueryClient() }))
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/pagamento?step=2')
    expect(url.searchParams.get('reason')).toBe(reason)
  })

  it.each([
    { kind: 'network', code: 'TRANSIENT', message: 'x' },
    { kind: 'timeout', code: 'TRANSIENT', message: 'x' },
    { kind: 'http', status: 503, code: 'TRANSIENT', message: 'x' },
  ])('$kind $status propaga sem redirect para login', async (apiError) => {
    store.set('kurio:session', JSON.stringify({ token: 'tok-1', uid: 'u-1' }))
    request.mockRejectedValue(apiError)
    const error = await caught({ queryClient: createQueryClient() })
    expect(isRedirect(error)).toBe(false)
    expect(error).toBe(apiError)
  })
})
