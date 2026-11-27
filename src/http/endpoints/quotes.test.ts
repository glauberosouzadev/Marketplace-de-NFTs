import { describe, expect, it, vi } from 'vitest'

const request = vi.fn<(c: unknown) => Promise<unknown>>().mockResolvedValue({})
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { createQuote } from './quotes'

describe('createQuote', () => {
  it('POST /quotes com a rede e o signal', async () => {
    const signal = new AbortController().signal
    await createQuote({ network: 'ethereum' }, signal)
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/quotes',
      data: { network: 'ethereum' },
      signal,
    })
  })
})
