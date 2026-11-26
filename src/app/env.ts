interface Env {
  enableMocks: boolean
  apiBaseUrl: string
  wsUrl: string
  httpTimeoutMs: number
}

const raw = import.meta.env

const timeout = Number(raw.VITE_HTTP_TIMEOUT_MS)

export const env: Env = {
  enableMocks: raw.VITE_ENABLE_MOCKS === 'true',
  apiBaseUrl: raw.VITE_API_BASE_URL || '/api/v1',
  wsUrl: raw.VITE_WS_URL || 'wss://realtime.kurio.invalid',
  httpTimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 5000,
}
