import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POLITE_NOTICE_MS, noticeBus } from './notices'

describe('noticeBus', () => {
  beforeEach(() => noticeBus.clear())
  it('deduplica por id e preserva politeness', () => {
    noticeBus.publish({ id: 'a', politeness: 'polite', text: 'um' })
    noticeBus.publish({ id: 'a', politeness: 'polite', text: 'um' })
    noticeBus.publish({ id: 'b', politeness: 'assertive', text: 'dois' })
    const s = noticeBus.getSnapshot()
    expect(s.map((n) => n.id)).toEqual(['a', 'b'])
    expect(s[1]?.politeness).toBe('assertive')
  })
  it('dismiss permite republicar', () => {
    noticeBus.publish({ id: 'a', politeness: 'polite', text: 'um' })
    noticeBus.dismiss('a')
    noticeBus.publish({ id: 'a', politeness: 'polite', text: 'um' })
    expect(noticeBus.getSnapshot()).toHaveLength(1)
  })

  describe('auto-dispensa', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())
    const ids = (): string[] => noticeBus.getSnapshot().map((n) => n.id)

    it('polite some após o tempo; assertive fica até fechar', () => {
      noticeBus.publish({ id: 'p', politeness: 'polite', text: 'preço mudou' })
      noticeBus.publish({ id: 'a', politeness: 'assertive', text: 'esgotou' })
      vi.advanceTimersByTime(POLITE_NOTICE_MS - 1)
      expect(ids()).toEqual(['p', 'a'])
      vi.advanceTimersByTime(1)
      expect(ids()).toEqual(['a'])
      vi.advanceTimersByTime(POLITE_NOTICE_MS * 10)
      expect(ids()).toEqual(['a'])
    })

    it('foco e hover pausam; o tempo recomeça quando ambos saem', () => {
      noticeBus.publish({ id: 'p', politeness: 'polite', text: 'preço mudou' })
      noticeBus.hold('p')
      noticeBus.hold('p')
      vi.advanceTimersByTime(POLITE_NOTICE_MS * 2)
      noticeBus.release('p')
      vi.advanceTimersByTime(POLITE_NOTICE_MS * 2)
      expect(ids()).toEqual(['p'])
      noticeBus.release('p')
      vi.advanceTimersByTime(POLITE_NOTICE_MS - 1)
      expect(ids()).toEqual(['p'])
      vi.advanceTimersByTime(1)
      expect(ids()).toEqual([])
    })

    it('hold/release de aviso já dispensado não deixam sobra que trave o próximo', () => {
      noticeBus.publish({ id: 'p', politeness: 'polite', text: 'preço mudou' })
      noticeBus.hold('p')
      noticeBus.dismiss('p')
      noticeBus.release('p')
      noticeBus.hold('p')
      expect(vi.getTimerCount()).toBe(0)

      noticeBus.publish({ id: 'p', politeness: 'polite', text: 'preço mudou' })
      noticeBus.hold('p')
      noticeBus.release('p')
      vi.advanceTimersByTime(POLITE_NOTICE_MS)
      expect(ids()).toEqual([])
    })

    it('soltar um assertive não agenda dispensa', () => {
      noticeBus.publish({ id: 'a', politeness: 'assertive', text: 'esgotou' })
      noticeBus.hold('a')
      noticeBus.release('a')
      vi.advanceTimersByTime(POLITE_NOTICE_MS * 2)
      expect(ids()).toEqual(['a'])
    })
  })
})
