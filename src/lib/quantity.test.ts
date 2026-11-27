import { describe, expect, it } from 'vitest'
import type { Edition } from '@/contracts'
import {
  canDecrement,
  canIncrement,
  fitToLimit,
  limitMessage,
  parseQuantity,
  resolveEdition,
} from './quantity'

const edition = (id: string, available: number): Edition => ({
  id,
  nftId: 'n1',
  label: id,
  price: '1.0',
  available,
  soldOut: available === 0,
})

const editions = [edition('e1', 0), edition('e2', 3), edition('e3', 50)]

describe('resolveEdition (FR-11)', () => {
  it('usa a edição da URL quando disponível', () => {
    expect(resolveEdition(editions, 'e3')?.id).toBe('e3')
  })
  it('edição esgotada, inexistente ou ausente cai na primeira disponível', () => {
    expect(resolveEdition(editions, 'e1')?.id).toBe('e2')
    expect(resolveEdition(editions, 'xx')?.id).toBe('e2')
    expect(resolveEdition(editions, undefined)?.id).toBe('e2')
  })
  it('todas esgotadas: nenhuma edição', () => {
    expect(
      resolveEdition([edition('a', 0), { ...edition('b', 2), soldOut: true }], 'b'),
    ).toBeUndefined()
  })
})

describe('parseQuantity (RN-02)', () => {
  it('aceita inteiros de 1 até o disponível', () => {
    expect(parseQuantity('1', 3)).toEqual({ ok: true, value: 1 })
    expect(parseQuantity(' 3 ', 3)).toEqual({ ok: true, value: 3 })
  })
  it.each(['0', '-1', '1.5', '1,5', 'abc', '', '1e2', '99999999999999999999'])(
    'rejeita "%s"',
    (input) => {
      expect(parseQuantity(input, 1000)).toEqual({ ok: false, reason: 'invalid' })
    },
  )
  it('acima do disponível é rejeitado, não ajustado', () => {
    expect(parseQuantity('4', 3)).toEqual({ ok: false, reason: 'above-limit' })
  })
})

describe('limites do stepper (FR-12)', () => {
  it('"+" para no limite e "−" não passa de 1', () => {
    expect(canIncrement(2, 3)).toBe(true)
    expect(canIncrement(3, 3)).toBe(false)
    expect(canDecrement(2)).toBe(true)
    expect(canDecrement(1)).toBe(false)
  })
  it('carrinho acima da disponibilidade não permite "+" e a mensagem usa o plural correto', () => {
    expect(canIncrement(5, 3)).toBe(false)
    expect(limitMessage(1)).toBe('Limite atingido: máximo de 1 unidade nesta edição.')
    expect(limitMessage(3)).toBe('Limite atingido: máximo de 3 unidades nesta edição.')
  })
  it('troca de edição reduz ao novo limite e sinaliza o ajuste', () => {
    expect(fitToLimit(5, 10)).toEqual({ value: 5, adjusted: false })
    expect(fitToLimit(5, 3)).toEqual({ value: 3, adjusted: true })
  })
})
