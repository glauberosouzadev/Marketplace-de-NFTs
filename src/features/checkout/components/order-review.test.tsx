import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SoldOutMark } from './order-review'

describe('SoldOutMark', () => {
  it('marca a linha esgotada com texto e some com estoque', () => {
    expect(renderToStaticMarkup(<SoldOutMark line={{ available: 0 }} />)).toMatch(/>Esgotado</)
    expect(renderToStaticMarkup(<SoldOutMark line={{ available: 3 }} />)).toBe('')
  })
})
