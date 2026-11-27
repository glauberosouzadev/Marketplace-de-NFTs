import { describe, expect, it } from 'vitest'
import { cartCountLabel, countCartItems } from './use-cart-count'

const item = (quantity: number) => ({ quantity }) as never

describe('countCartItems', () => {
  it('soma as quantidades, não as linhas', () => {
    expect(countCartItems({ items: [item(2), item(3)] })).toBe(5)
  })
  it('retorna 0 sem carrinho ou vazio', () => {
    expect(countCartItems(undefined)).toBe(0)
    expect(countCartItems({ items: [] })).toBe(0)
  })
})

describe('cartCountLabel', () => {
  it('usa singular, plural e vazio', () => {
    expect(cartCountLabel(1)).toBe('1 item no carrinho')
    expect(cartCountLabel(6)).toBe('6 itens no carrinho')
    expect(cartCountLabel(0)).toBe('Carrinho vazio')
  })
})
