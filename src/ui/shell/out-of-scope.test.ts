import { afterEach, describe, expect, it } from 'vitest'
import { noticeBus } from '@/realtime/notices'
import { OUT_OF_SCOPE_TEXT, publishOutOfScope } from './out-of-scope'

describe('publishOutOfScope', () => {
  afterEach(() => noticeBus.clear())

  it('publica o aviso polite uma única vez, mesmo acionado várias vezes', () => {
    publishOutOfScope()
    publishOutOfScope()
    expect(noticeBus.getSnapshot()).toEqual([
      { id: 'out-of-scope', politeness: 'polite', text: OUT_OF_SCOPE_TEXT },
    ])
  })

  it('volta a avisar depois que o aviso é dispensado', () => {
    publishOutOfScope()
    noticeBus.dismiss('out-of-scope')
    publishOutOfScope()
    expect(noticeBus.getSnapshot()).toHaveLength(1)
  })
})
