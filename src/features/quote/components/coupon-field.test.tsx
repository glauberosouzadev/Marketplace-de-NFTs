import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CouponField } from './coupon-field'

const render = (appliedCode: string | undefined, applyDisabled: boolean): string =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <CouponField appliedCode={appliedCode} applyDisabled={applyDisabled} />
    </QueryClientProvider>,
  )

describe('CouponField', () => {
  it('com cupom salvo e carrinho vazio, "Remover cupom" continua disponível', () => {
    const html = render('KURIO10', true)
    expect(html).toMatch(/<button[^>]*>Remover cupom<\/button>/)
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Remover cupom/)
  })

  it('sem cupom, applyDisabled bloqueia campo e "Aplicar"', () => {
    const html = render(undefined, true)
    expect(html).toMatch(/<input[^>]*disabled=""/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Aplicar<\/button>/)
  })
})
