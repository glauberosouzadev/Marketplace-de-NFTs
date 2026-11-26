import { beforeEach, describe, expect, it } from 'vitest'
import { noticeBus } from './notices'

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
})
