import { describe, expect, it, vi } from 'vitest'
import { NOTICES_ATTR, keepOpenOnNotices } from './notices-region'

const element = (insideNotices: boolean) =>
  ({
    closest: (selector: string) => (insideNotices && selector === `[${NOTICES_ATTR}]` ? {} : null),
  }) as unknown as Element

const outside = (target: EventTarget | null) => ({ target, preventDefault: vi.fn() })

describe('keepOpenOnNotices', () => {
  it('clique ou foco nos avisos não fecha o modal; o handler da tela segue sendo chamado', () => {
    const handler = vi.fn()
    const event = outside(element(true))
    keepOpenOnNotices(handler)(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('clique fora de verdade continua fechando', () => {
    for (const target of [element(false), null]) {
      const event = outside(target)
      keepOpenOnNotices()(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
  })
})
