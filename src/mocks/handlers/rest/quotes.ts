import { http, HttpResponse } from 'msw'
import type { Network } from '@/contracts'
import { getOrCreateCart } from '../../db/cart'
import { buildQuote } from '../../db/quote'
import { getDb } from '../../db/store'
import { DEFAULT_NETWORK, NETWORK_FEES } from '../../fixtures/networks'
import { apiUrl, errorResponse, withScenario } from '../util'
import { readBody, resolveOwner } from './cart'

const isNetwork = (value: unknown): value is Network =>
  typeof value === 'string' && Object.hasOwn(NETWORK_FEES, value)

export const quotesHandlers = [
  http.post(
    apiUrl('/quotes'),
    withScenario('POST /quotes', async ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const { network = DEFAULT_NETWORK } = await readBody(request)
      if (!isNetwork(network)) {
        return errorResponse(422, 'VALIDATION', 'Corpo inválido', { network: 'Rede inválida' })
      }
      const cart = getOrCreateCart(owner)
      return HttpResponse.json(await buildQuote(getDb(), cart, network))
    }),
  ),
]
