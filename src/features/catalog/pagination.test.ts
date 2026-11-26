import { describe, expect, it } from 'vitest'
import { clampPage, pageWindow, shouldShowEmpty } from './pagination'

describe('clampPage', () => {
  it('corrige página acima do total', () => expect(clampPage(9, 3)).toBe(3))
  it('mantém página válida', () => expect(clampPage(3, 3)).toBeNull())
  it('lista vazia usa a página 1', () => expect(clampPage(2, 0)).toBe(1))
  it('lista vazia na página 1 não corrige', () => expect(clampPage(1, 0)).toBeNull())
})

describe('pageWindow', () => {
  it('mostra todas quando poucas', () => expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]))
  it('insere reticências', () => expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]))
  it('sem reticências quando contíguas', () => expect(pageWindow(2, 10)).toEqual([1, 2, 3, null, 10]))
})

describe('shouldShowEmpty', () => {
  it('só mostra vazio sem correção de página pendente', () => {
    expect(shouldShowEmpty(0, null)).toBe(true)
    expect(shouldShowEmpty(0, 2)).toBe(false)
    expect(shouldShowEmpty(3, null)).toBe(false)
  })
})
