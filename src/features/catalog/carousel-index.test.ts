import { describe, expect, it } from 'vitest'
import { stepIndex } from './carousel-index'

describe('stepIndex', () => {
  it('avança e volta de forma circular', () => {
    expect(stepIndex(0, 1, 3)).toBe(1)
    expect(stepIndex(2, 1, 3)).toBe(0)
    expect(stepIndex(0, -1, 3)).toBe(2)
  })
  it('lista vazia mantém 0', () => {
    expect(stepIndex(0, 1, 0)).toBe(0)
  })
})
