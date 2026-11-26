import { describe, expect, it } from 'vitest'
import { shouldWriteQuery } from './query-write'

describe('shouldWriteQuery', () => {
  it('não grava texto igual ao da URL (inclusive vazio)', () => {
    expect(shouldWriteQuery('', '')).toBe(false)
    expect(shouldWriteQuery('rare', 'rare')).toBe(false)
  })
  it('grava texto diferente', () => {
    expect(shouldWriteQuery('rare', '')).toBe(true)
  })
})
