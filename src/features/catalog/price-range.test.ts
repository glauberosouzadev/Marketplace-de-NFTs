import { describe, expect, it } from 'vitest'
import {
  boundsToSteps,
  formatRange,
  paramsToRange,
  rangeToParams,
  stepsToPrice,
} from './price-range'

const bounds = { min: '0.02', max: '12.30' }

describe('price-range', () => {
  it('converte limites decimais em passos de 0,01', () => {
    expect(boundsToSteps(bounds)).toEqual([2, 1230])
    expect(boundsToSteps({ min: '0.025', max: '1.001' })).toEqual([2, 101])
  })

  it('formata passos com ponto e duas casas', () => {
    expect(stepsToPrice(5)).toBe('0.05')
    expect(stepsToPrice(1230)).toBe('12.30')
    expect(formatRange([2, 1230])).toBe('Preço: 0.02 - 12.30 ETH')
  })

  it('omite parâmetros quando a faixa coincide com os limites', () => {
    expect(rangeToParams(bounds, [2, 1230])).toEqual({ priceMin: undefined, priceMax: undefined })
    expect(rangeToParams(bounds, [50, 900])).toEqual({ priceMin: '0.50', priceMax: '9.00' })
  })

  it('lê a URL contendo a faixa nos limites e ignora valores inválidos', () => {
    expect(paramsToRange(bounds, '0.50', '9')).toEqual([50, 900])
    expect(paramsToRange(bounds, '0', '99')).toEqual([2, 1230])
    expect(paramsToRange(bounds, 'abc', undefined)).toEqual([2, 1230])
    expect(paramsToRange(bounds, '9', '1')).toEqual([900, 900])
  })
})
