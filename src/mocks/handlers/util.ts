import { delay, HttpResponse, type HttpResponseResolver, type PathParams } from 'msw'
import type { ErrorCode, ErrorEnvelope, FieldErrors, Session } from '@/contracts'
import { getDb } from '../db/store'
import type { MockUser } from '../db/types'
import { getActiveEngine } from '../scenarios/active'
import type { FailureSpec, ScenarioFlows } from '../scenarios/types'

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

/** 401 para token ausente/desconhecido (`UNAUTHENTICATED`) ou vencido (`SESSION_EXPIRED`). */
export function sessionError(request: Request): Response {
  const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1]
  return getDb().sessions.some((s) => s.token === token)
    ? errorResponse(401, 'SESSION_EXPIRED', 'Sessão expirada')
    : errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida')
}

export const resolveGuestCartId = (request: Request): string | null =>
  request.headers.get('X-Guest-Cart-Id')

export interface ScenarioOptions {
  /** Verdadeiro: o resolver roda antes da falha planejada (efeito aplicado, resposta perdida). */
  failAfterEffect?: (flows: ScenarioFlows) => boolean
}

function failureResponse(failure: FailureSpec): Response | null {
  if (failure.kind === 'offline') return HttpResponse.error()
  if (failure.kind === 'http') {
    return errorResponse(failure.status, failure.code, failure.message, failure.fieldErrors)
  }
  return null
}

export function withScenario<P extends PathParams = PathParams>(
  routeKey: string,
  resolver: HttpResponseResolver<P>,
  options: ScenarioOptions = {},
): HttpResponseResolver<P> {
  return async (info) => {
    const engine = getActiveEngine()
    const { delayMs, failure } = engine.plan(routeKey)
    if (failure && options.failAfterEffect?.(engine.scenario.flows)) {
      const response = await resolver(info)
      if (delayMs > 0) await delay(delayMs)
      return failureResponse(failure) ?? response
    }
    if (delayMs > 0) await delay(delayMs)
    return (failure && failureResponse(failure)) ?? resolver(info)
  }
}
