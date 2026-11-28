import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StaleDiff } from './stale-diff'

const render = (canAccept = true): string =>
  renderToStaticMarkup(
    <StaleDiff
      canAccept={canAccept}
      onAccept={() => undefined}
      changes={[{ id: 'total', label: 'Total', previous: '2.396 ETH', current: '3.016 ETH' }]}
    />,
  )

describe('StaleDiff', () => {
  it('anuncia a mudança e mostra anterior → atual em texto', () => {
    const html = render()
    expect(html).toMatch(/role="alert"[^>]*>Os valores mudaram. Revise e confirme novamente./)
    expect(html).toContain('<del class="text-muted-foreground">2.396 ETH</del>')
    expect(html).toContain('<span class="sr-only"> para </span>')
    expect(html).toMatch(/<ins[^>]*>3.016 ETH<\/ins>/)
  })

  it('sem a nova cotação não deixa aceitar', () => {
    expect(render(false)).toMatch(/<button[^>]*disabled=""[^>]*>Aceitar novos valores/)
  })
})
