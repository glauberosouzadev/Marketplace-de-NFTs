import { http, HttpResponse } from 'msw'
import type { FieldErrors, OrderResponse, QuoteStaleBody } from '@/contracts'
import {
  createOrder,
  findUserOrder,
  type SettlementStatus,
  validateOrderRequest,
} from '../../db/orders'
import { getActiveEngine } from '../../scenarios/active'
import type { ScenarioFlows } from '../../scenarios/types'
import { settleOrder } from '../../settlement'
import { apiUrl, errorResponse, resolveSession, sessionError, withScenario } from '../util'
import { readBody } from './cart'

const validation = (fieldErrors: FieldErrors): Response =>
  errorResponse(422, 'VALIDATION', 'Corpo inválido', fieldErrors)

const AUTO_SETTLEMENT: Partial<Record<NonNullable<ScenarioFlows['order']>, SettlementStatus>> = {
  confirmed: 'confirmed',
  declined: 'rejected',
}

function scheduleSettlement(orderId: string): void {
  const engine = getActiveEngine()
  const status = AUTO_SETTLEMENT[engine.scenario.flows.order ?? 'manual']
  if (!status) return
  const { delayMs } = engine.plan('SETTLE /orders/:id')
  setTimeout(() => settleOrder(orderId, status), delayMs)
}

export const ordersHandlers = [
  http.post(
    apiUrl('/orders'),
    withScenario(
      'POST /orders',
      async ({ request }) => {
        const auth = resolveSession(request)
        if (!auth) return sessionError(request)
        const idempotencyKey = request.headers.get('Idempotency-Key')?.trim()
        if (!idempotencyKey) return validation({ 'Idempotency-Key': 'Cabeçalho obrigatório' })
        const validated = validateOrderRequest(await readBody(request))
        if (!validated.ok) return validation(validated.fieldErrors)

        const result = await createOrder({
          userId: auth.user.id,
          idempotencyKey,
          request: validated.value,
        })
        switch (result.kind) {
          case 'created':
            scheduleSettlement(result.order.id)
            return HttpResponse.json<OrderResponse>(result.order, { status: 201 })
          case 'replay':
            return HttpResponse.json<OrderResponse>(result.order)
          case 'conflict':
            return errorResponse(409, 'IDEMPOTENCY_CONFLICT', 'Chave já usada com outro pedido')
          case 'invalid':
            return validation(result.fieldErrors)
          case 'disconnected':
            return errorResponse(409, 'WALLET_DISCONNECTED', 'Carteira desconectada')
          case 'stale': {
            const body: QuoteStaleBody = {
              code: 'QUOTE_STALE',
              message: 'A cotação mudou',
              quote: result.quote,
            }
            return HttpResponse.json(body, { status: 409 })
          }
        }
      },
      { failAfterEffect: (flows) => flows.order === 'timeout-after-create' },
    ),
  ),
  http.get<{ id: string }>(
    apiUrl('/orders/:id'),
    withScenario('GET /orders/:id', ({ request, params }) => {
      const auth = resolveSession(request)
      if (!auth) return sessionError(request)
      const order = findUserOrder(auth.user.id, params.id)
      if (!order) return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado')
      return HttpResponse.json<OrderResponse>(order)
    }),
  ),
]
