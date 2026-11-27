import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '@/contracts'
import { getGuestCartId, getSession } from '@/lib/storage'
import { normalizeError } from './normalize-error'

const DEFAULT_TIMEOUT_MS = 5000

function timeoutMs(): number {
  const parsed = Number(import.meta.env.VITE_HTTP_TIMEOUT_MS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

const needsGuestCart = (url = ''): boolean => /^\/(cart|quotes)(\/|\?|$)/.test(url)
// Além de login/cadastro (TSD-10), o logout: a própria saída já limpa tudo e não deve virar expiração.
const isAuthEntry = (url = ''): boolean => /^\/auth\/(login|register|logout)(\/|\?|$)/.test(url)

let sessionExpiredHandler: (() => void) | null = null

/** Registrado por `app/providers` para `http/` não depender de router nem de Query. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler
}

/**
 * Só a sessão que fez o pedido pode expirar: se ela já foi encerrada (outro 401 simultâneo,
 * logout), o 401 tardio não repete a limpeza nem entra em laço.
 */
function notifySessionExpired(error: ApiError, url: string | undefined, sentToken: string | null) {
  if (error.status !== 401 || error.code !== 'SESSION_EXPIRED' || isAuthEntry(url)) return
  if (sentToken === null || getSession()?.token !== sentToken) return
  sessionExpiredHandler?.()
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const session = getSession()
  if (session) {
    config.headers.set('Authorization', `Bearer ${session.token}`)
  } else if (needsGuestCart(config.url)) {
    config.headers.set('X-Guest-Cart-Id', getGuestCartId())
  }
  return config
})

/**
 * Único ponto de chamadas REST. Timeout via AbortController + setTimeout
 * (TSD-07); o `signal` do chamador é repassado. Rejeita com `ApiError`.
 * `Idempotency-Key` entra por `config.headers` (o cliente não o gera).
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs())

  const external = config.signal as AbortSignal | undefined | null
  const onExternalAbort = (): void => controller.abort()
  if (external?.aborted) controller.abort()
  else external?.addEventListener('abort', onExternalAbort, { once: true })

  const sentToken = getSession()?.token ?? null
  try {
    const response = await http.request<T>({ ...config, signal: controller.signal })
    return response.data
  } catch (error) {
    const apiError = normalizeError(error, { timedOut })
    notifySessionExpired(apiError, config.url, sentToken)
    throw apiError
  } finally {
    clearTimeout(timer)
    external?.removeEventListener('abort', onExternalAbort)
  }
}
