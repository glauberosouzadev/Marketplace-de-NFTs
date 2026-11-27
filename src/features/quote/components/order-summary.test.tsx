import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CartItem, Quote } from '@/contracts'
import { OrderSummary } from './order-summary'

const quote: Quote = {
  id: 'q1',
  cartVersion: 3,
  fingerprint: 'f',
  network: 'ethereum',
  lines: [],
  subtotal: '8.920000000000000001',
  discount: '0.892000000000000000',
  networkFee: '0.016',
  total: '8.044000000000000001',
  issues: [],
}

const withCoupon: Quote = { ...quote, coupon: { code: 'KURIO10', status: 'applied' } }

const item: CartItem = {
  nftId: 'n1',
  editionId: 'e1',
  quantity: 1,
  name: 'Emerald Ape #042',
  image: { url: '/a.png', alt: 'a' },
  unitPrice: '1.19',
  available: 1,
}

describe('OrderSummary', () => {
  it('exibe os valores da cotação sem alterar a string', () => {
    const html = renderToStaticMarkup(<OrderSummary quote={withCoupon} items={[]} />)
    expect(html).toContain('8.920000000000000001 ETH')
    expect(html).toContain('(-) 0.892000000000000000 ETH')
    expect(html).toContain('0.016 ETH')
    expect(html).toContain('Taxa estimada')
    expect(html).toContain('8.044000000000000001 ETH')
  })

  it('sem cupom mostra o texto do Figma e lista issues em texto', () => {
    const html = renderToStaticMarkup(
      <OrderSummary
        quote={{
          ...quote,
          issues: [{ type: 'SOLD_OUT', nftId: 'n1', editionId: 'e1' }],
        }}
        items={[item]}
      />,
    )
    expect(html).toContain('(-) 00.00')
    expect(html).toContain('Esgotado: Emerald Ape #042.')
  })
})
