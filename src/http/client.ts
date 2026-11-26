import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { getGuestCartId, getSession } from '@/lib/storage'
import { normalizeError } from './normalize-error'

const DEFAULT_TIMEOUT_MS = 5000

function timeoutMs(): number {
  const parsed = Number(import.meta.env.VITE_HTTP_TIMEOUT_MS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

const needsGuestCart = (url = ''): boolean => /^\/(cart|quotes)(\/|\?|$)/.test(url)

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

  try {
    const response = await http.request<T>({ ...config, signal: controller.signal })
    return response.data
  } catch (error) {
    throw normalizeError(error, { timedOut })
  } finally {
    clearTimeout(timer)
    external?.removeEventListener('abort', onExternalAbort)
  }
}
