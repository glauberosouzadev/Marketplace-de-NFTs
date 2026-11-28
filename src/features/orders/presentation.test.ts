import { describe, expect, it } from 'vitest'
import {
  confirmationText,
  explorerName,
  hasDiscount,
  orderHref,
  providerLabel,
  receiptDate,
  transactionId,
} from './presentation'

describe('presentation do recibo', () => {
  it('orderHref aponta para a rota tipada do pedido', () => {
    expect(orderHref('o 1')).toEqual({ to: '/pedido/$orderId', params: { orderId: 'o 1' } })
  })

  it('"Desconto" só com valor maior que 0, em comparação decimal', () => {
    expect(hasDiscount({ discount: '0' })).toBe(false)
    expect(hasDiscount({ discount: '0.000' })).toBe(false)
    expect(hasDiscount({ discount: '0.000000000000000001' })).toBe(true)
    expect(hasDiscount({ discount: '1.5' })).toBe(true)
  })

  it('texto e explorador citam a rede do pedido', () => {
    expect(confirmationText('ethereum')).toContain('confirmada na Ethereum.')
    expect(confirmationText('polygon')).toContain('confirmada na Polygon.')
    expect(confirmationText('solana')).toContain('confirmada na Solana.')
    expect(explorerName('ethereum')).toBe('Etherscan')
    expect(explorerName('polygon')).toBe('Polygonscan')
    expect(explorerName('solana')).toBe('Solscan')
  })

  it('formata data, ID da transação e carteira', () => {
    expect(receiptDate({ createdAt: '2026-07-29T12:00:00.000Z' })).toBe('29 Jul, 2026')
    expect(
      receiptDate({ createdAt: '2026-01-01T12:00:00.000Z', settledAt: '2026-07-29T12:00:00.000Z' }),
    ).toBe('29 Jul, 2026')
    expect(transactionId({ txHash: `0xA91F${'0'.repeat(54)}E82C` })).toBe('0xA91F…E82C')
    expect(transactionId({})).toBe('—')
    expect(providerLabel('metamask')).toBe('MetaMask')
  })
})
