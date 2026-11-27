import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import type { User } from '@/contracts'
import { loginHref } from '@/contracts/search'
import { isApiError } from '@/http/normalize-error'
import { sessionQuery } from './queries'

export interface GuardContext {
  queryClient: Pick<QueryClient, 'ensureQueryData'>
}

const toLogin = (href: string, expired = false) =>
  redirect({ href: loginHref(href, expired ? 'expired' : undefined), replace: true })

/**
 * Guard das rotas privadas (SDD-03, FR-46). 401 conta como "sem sessão"; rede, timeout e 5xx
 * propagam como erro de rota.
 */
export async function requireSession(
  context: GuardContext,
  location: { href: string },
): Promise<{ user: User }> {
  let user: User | null
  try {
    user = await context.queryClient.ensureQueryData(sessionQuery())
  } catch (error) {
    if (!isApiError(error) || error.status !== 401) throw error
    // Mesmo destino que o `expireSession` do interceptor monta, então as duas navegações convergem.
    throw toLogin(location.href, error.code === 'SESSION_EXPIRED')
  }
  if (!user) throw toLogin(location.href)
  return { user }
}
