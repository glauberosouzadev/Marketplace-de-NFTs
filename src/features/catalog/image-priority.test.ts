import { describe, expect, it } from 'vitest'
import { shouldPrioritizeGrid } from './image-priority'

describe('shouldPrioritizeGrid', () => {
  it('não prioriza durante o carregamento', () => {
    expect(shouldPrioritizeGrid({ isPending: true, isError: false })).toBe(false)
  })
  it('prioriza quando os destaques falham', () => {
    expect(shouldPrioritizeGrid({ isPending: false, isError: true })).toBe(true)
  })
  it('prioriza quando os destaques vêm vazios', () => {
    expect(shouldPrioritizeGrid({ isPending: false, isError: false, data: { items: [] } })).toBe(
      true,
    )
  })
  it('não prioriza com hero/carrossel', () => {
    expect(shouldPrioritizeGrid({ isPending: false, isError: false, data: { items: [1] } })).toBe(
      false,
    )
  })
})
