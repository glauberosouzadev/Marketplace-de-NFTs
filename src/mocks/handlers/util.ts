import { delay, HttpResponse, type HttpResponseResolver, type PathParams } from 'msw'
import type { ErrorCode, ErrorEnvelope, FieldErrors, Session } from '@/contracts'
import { getDb } from '../db/store'
import type { MockUser } from '../db/types'
import { getActiveEngine } from '../scenarios/active'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1'

export const apiUrl = (path: string): string => `${API_BASE}${path}`

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
): Response {
  const body: ErrorEnvelope = { code, message, ...(fieldErrors ? { fieldErrors } : {}) }
  return HttpResponse.json(body, { status })
}

export interface ResolvedSession {
  session: Session
  user: MockUser
}

export function resolveSession(request: Request): ResolvedSession | null {
  const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1]
  return token ? resolveSessionToken(token) : null
}

/** Mesma regra do REST, para o token vindo do `auth` do handshake WS (TSD-04). */
export function resolveSessionToken(token: string): ResolvedSession | null {
  const db = getDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null
  const user = db.users.find((u) => u.id === session.userId)
  return user ? { session, user } : null
}

export const resolveGuestCartId = (request: Request): string | null =>
  request.headers.get('X-Guest-Cart-Id')

export function withScenario<P extends PathParams = PathParams>(
  routeKey: string,
  resolver: HttpResponseResolver<P>,
): HttpResponseResolver<P> {
  return async (info) => {
    const { delayMs, failure } = getActiveEngine().plan(routeKey)
    if (delayMs > 0) await delay(delayMs)
    if (failure?.kind === 'offline') return HttpResponse.error()
    if (failure?.kind === 'http') {
      return errorResponse(failure.status, failure.code, failure.message, failure.fieldErrors)
    }
    return resolver(info)
  }
}
