import { request } from '@/http/client'
import type { QuoteRequest, QuoteResponse } from '@/contracts'

export function createQuote(body: QuoteRequest, signal: AbortSignal): Promise<QuoteResponse> {
  return request<QuoteResponse>({ method: 'POST', url: '/quotes', data: body, signal })
}
