import { describe, expect, it } from 'vitest'
import { queryKeys, type Scope } from '@/app/query-keys'
import type { Cart } from '@/contracts'
import { quoteQuery } from './queries'

const scope: Scope = ['user', 'u-1']
const cart: Cart = { id: 'c1', owner: 'user:u-1', items: [], version: 4, couponCode: 'KURIO10' }

describe('quoteQuery', () => {
  it('chave com versão, cupom e rede', () => {
    expect(quoteQuery(scope, cart, 'ethereum').queryKey).toEqual(
      queryKeys.quote(scope, 4, 'KURIO10', 'ethereum'),
    )
  })

  it('muda a chave quando versão, cupom ou rede mudam', () => {
    const base = quoteQuery(scope, cart, 'ethereum').queryKey
    expect(quoteQuery(scope, { ...cart, version: 5 }, 'ethereum').queryKey).not.toEqual(base)
    expect(
      quoteQuery(scope, { id: 'c1', owner: 'user:u-1', items: [], version: 4 }, 'ethereum')
        .queryKey[4],
    ).toBeNull()
    expect(quoteQuery(scope, cart, 'polygon').queryKey).not.toEqual(base)
  })
})
