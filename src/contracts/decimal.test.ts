import { describe, expect, it } from 'vitest'
import { add, applyBps, compare, mulInt, parse, sub, toString, DecimalError } from './decimal'

const sum = (a: string, b: string) => toString(add(parse(a), parse(b)))

describe('decimal ETH', () => {
  it('soma sem erro de ponto flutuante (NFR-07)', () => {
    expect(sum('0.1', '0.2')).toBe('0.3')
    expect(sum('26.83', '0.016')).toBe('26.846')
  })

  it('soma com 18 casas e inteiros', () => {
    expect(sum('0.000000000000000001', '0.000000000000000001')).toBe('0.000000000000000002')
    expect(sum('1', '2')).toBe('3')
  })

  it('subtrai e rejeita resultado negativo', () => {
    expect(toString(sub(parse('1'), parse('0.1')))).toBe('0.9')
    expect(toString(sub(parse('0.3'), parse('0.3')))).toBe('0')
    expect(() => sub(parse('0.1'), parse('0.2'))).toThrow(DecimalError)
  })

  it('toString remove zeros à direita', () => {
    expect(toString(parse('1.500'))).toBe('1.5')
    expect(toString(parse('2.0'))).toBe('2')
    expect(toString(parse('0'))).toBe('0')
  })

  it('mulInt multiplica por quantidade inteira', () => {
    expect(toString(mulInt(parse('0.016'), 3))).toBe('0.048')
    expect(toString(mulInt(parse('26.83'), 0))).toBe('0')
    expect(() => mulInt(parse('1'), 1.5)).toThrow(DecimalError)
    expect(() => mulInt(parse('1'), -1)).toThrow(DecimalError)
  })

  it('applyBps arredonda para baixo', () => {
    expect(toString(applyBps(parse('10'), 250))).toBe('0.25')
    expect(toString(applyBps(parse('1'), 10_000))).toBe('1')
    expect(toString(applyBps(parse('1'), 0))).toBe('0')
    // 1 wei * 1 bp = 0,0001 wei, arredondado para 0
    expect(toString(applyBps(parse('0.000000000000000001'), 1))).toBe('0')
    // 3 wei * 3333 bps = 0,9999 wei, arredondado para 0
    expect(toString(applyBps(parse('0.000000000000000003'), 3333))).toBe('0')
    expect(toString(applyBps(parse('0.000000000000000010'), 5000))).toBe('0.000000000000000005')
  })

  it('applyBps rejeita bps negativo ou não inteiro', () => {
    expect(() => applyBps(parse('1'), -1)).toThrow(DecimalError)
    expect(() => applyBps(parse('1'), -250n)).toThrow(DecimalError)
    expect(() => applyBps(parse('1'), 1.5)).toThrow(DecimalError)
  })

  it('compare ordena corretamente', () => {
    expect(compare(parse('0.1'), parse('0.2'))).toBe(-1)
    expect(compare(parse('0.2'), parse('0.1'))).toBe(1)
    expect(compare(parse('1.0'), parse('1'))).toBe(0)
    expect(compare(parse('0.000000000000000001'), parse('0'))).toBe(1)
  })

  it.each(['', '-1', '1.', '.5', '1,5', '1e3', 'abc', '0.1234567890123456789', ' 1', '1 '])(
    'parse rejeita entrada inválida %j',
    (input) => {
      expect(() => parse(input)).toThrow(DecimalError)
    },
  )
})
