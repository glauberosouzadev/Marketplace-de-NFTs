import { QueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/contracts'

function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'kind' in error
}

/** 4xx nunca refaz; rede/timeout/5xx refazem até `limit` vezes. */
export function shouldRetry(failureCount: number, error: unknown, limit = 2): boolean {
  if (!isApiError(error)) return failureCount < limit
  const e = error
  if (e.kind === 'http' && (e.status ?? 0) < 500) return false
  if (e.kind === 'canceled') return false
  return failureCount < limit
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (n, e) => shouldRetry(n, e),
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: 0 },
    },
  })
}

export const queryClient = createQueryClient()
