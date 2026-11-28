import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CartResponse } from '@/contracts'

vi.mock('@/http/client', () => ({ request: vi.fn() }))

import { EMPTY_CART_NOTICE, requireCartItems } from './guard'

const client = (items: CartResponse['items']) => ({
  fetchQuery: vi.fn().mockResolvedValue({ items } as CartResponse),
})

describe('requireCartItems', () => {
  it('carrinho vazio redireciona a /carrinho e publica o aviso', async () => {
    const publish = vi.fn()
    const error = await requireCartItems(client([]), 'u-1', publish).catch((e: unknown) => e)
    expect(isRedirect(error)).toBe(true)
    expect((error as { options: { to: string } }).options.to).toBe('/carrinho')
    expect(publish).toHaveBeenCalledWith(EMPTY_CART_NOTICE)
  })

  it('com itens segue sem aviso, lendo o carrinho do usuário', async () => {
    const publish = vi.fn()
    const queryClient = client([{ nftId: 'n1' } as CartResponse['items'][number]])
    await expect(requireCartItems(queryClient, 'u-1', publish)).resolves.toBeUndefined()
    expect(publish).not.toHaveBeenCalled()
    expect(queryClient.fetchQuery.mock.calls[0]?.[0]).toMatchObject({
      queryKey: ['user', 'u-1', 'cart'],
    })
  })
})
