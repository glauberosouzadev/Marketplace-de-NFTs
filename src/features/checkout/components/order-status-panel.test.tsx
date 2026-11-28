import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ApiError } from '@/contracts'
import { orderHref } from '@/features/orders/presentation'
import type { CheckoutStatus } from '../checkout-machine'
import { OrderStatusPanel } from './order-status-panel'

const render = (status: CheckoutStatus, error: ApiError | null = null): string =>
  renderToStaticMarkup(
    <OrderStatusPanel
      status={status}
      error={error}
      onResend={() => undefined}
      onRetry={() => undefined}
    />,
  )

describe('OrderStatusPanel', () => {
  it('pendente mostra "aguardando confirmação" sem ação', () => {
    const html = render('pending')
    expect(html).toContain('Aguardando confirmação do pagamento…')
    expect(html).not.toContain('Tentar novamente')
  })

  it('recusado preserva os itens e oferece nova tentativa explícita', () => {
    const html = render('rejected')
    expect(html).toContain('Pagamento recusado. Seus itens continuam no carrinho.')
    expect(html).toContain('Tentar novamente')
  })

  it('resultado desconhecido explica e permite reenviar', () => {
    const conflict: ApiError = {
      kind: 'http',
      status: 409,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'x',
    }
    expect(render('verifying')).toContain('Algo deu errado. Tente novamente.')
    expect(render('verifying', conflict)).toContain('Este pedido já foi enviado com outros dados.')
  })

  it('fora do envio não mostra estado do pedido', () => {
    expect(render('reviewing')).not.toMatch(/role="status"[^>]*>[^<]/)
  })
})

describe('orderHref', () => {
  it('aponta para o recibo do pedido', () => {
    expect(orderHref('o 1')).toEqual({ to: '/pedido/$orderId', params: { orderId: 'o 1' } })
  })
})
