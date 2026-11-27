import axios from 'axios'
import type { ApiError, ErrorCode, ErrorEnvelope } from '@/contracts'
import { errorMessage, isErrorCode } from './error-messages'

export interface NormalizeContext {
  timedOut: boolean
}

function isFieldErrors(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'string')
  )
}

function isEnvelope(data: unknown): data is ErrorEnvelope {
  if (typeof data !== 'object' || data === null) return false
  const candidate = data as Record<string, unknown>
  return isErrorCode(candidate.code) && typeof candidate.message === 'string'
}

const API_ERROR_KINDS: readonly string[] = ['http', 'network', 'timeout', 'canceled']

/** Type guard do `ApiError` normalizado. */
export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.kind === 'string' &&
    API_ERROR_KINDS.includes(candidate.kind) &&
    typeof candidate.message === 'string'
  )
}

/** A expiração já tem aviso global (interceptor 401); quem trata o erro localmente não o repete. */
export const isSessionExpired = (value: unknown): boolean =>
  isApiError(value) && value.code === 'SESSION_EXPIRED'

function transient(kind: ApiError['kind'], status?: number): ApiError {
  const code: ErrorCode = 'TRANSIENT'
  const base: ApiError = { kind, code, message: errorMessage(code) }
  return status === undefined ? base : { ...base, status }
}

/** Converte qualquer falha do Axios em `ApiError` (TSD-03). */
export function normalizeError(error: unknown, context: NormalizeContext): ApiError {
  if (context.timedOut) return transient('timeout')
  if (axios.isCancel(error)) {
    return { kind: 'canceled', code: 'TRANSIENT', message: '' }
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === undefined) return transient('network')
    if (status >= 500) return transient('http', status)
    const data: unknown = error.response?.data
    if (isEnvelope(data)) {
      const base: ApiError = { kind: 'http', status, code: data.code, message: data.message }
      return isFieldErrors(data.fieldErrors) ? { ...base, fieldErrors: data.fieldErrors } : base
    }
    return transient('http', status)
  }
  return transient('network')
}
