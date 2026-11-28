import { QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'

const request = vi.fn<(c: unknown) => Promise<unknown>>()
vi.mock('@/http/client', () => ({ request: (c: unknown) => request(c) }))

import { profileQuery } from './queries'

describe('profileQuery', () => {
  it('usa a chave por uid e busca /me/profile', async () => {
    request.mockResolvedValue({ displayName: 'Ana' })
    const client = createQueryClient()
    const opts = profileQuery('u-1')
    expect(opts.queryKey).toEqual(queryKeys.profile('u-1'))
    await new QueryObserver(client, opts).refetch()
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/me/profile' }))
  })
})
