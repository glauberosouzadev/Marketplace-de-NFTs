import { http, HttpResponse } from 'msw'
import type { WalletConnectionResponse, WalletsResponse } from '@/contracts'
import {
  connectWallet,
  disconnectConnection,
  isNetwork,
  isWalletProvider,
  isWalletSlot,
  upsertWallet,
  validateUpsert,
} from '../../db/wallets'
import { getDb } from '../../db/store'
import {
  apiUrl,
  errorResponse,
  resolveSession,
  sessionError,
  withScenario,
  type ResolvedSession,
} from '../util'
import { readBody } from './cart'

const notFound = (message: string): Response => errorResponse(404, 'NOT_FOUND', message)

function requireSession(request: Request): ResolvedSession | Response {
  return resolveSession(request) ?? sessionError(request)
}

export const walletsHandlers = [
  http.get(
    apiUrl('/me/wallets'),
    withScenario('GET /me/wallets', ({ request }) => {
      const auth = requireSession(request)
      if (auth instanceof Response) return auth
      const own = getDb().wallets.filter((w) => w.userId === auth.user.id)
      const body: WalletsResponse = {
        primary: own.find((w) => w.slot === 'primary') ?? null,
        secondary: own.find((w) => w.slot === 'secondary') ?? null,
      }
      return HttpResponse.json(body)
    }),
  ),
  http.put<{ slot: string }>(
    apiUrl('/me/wallets/:slot'),
    withScenario('PUT /me/wallets/:slot', async ({ request, params }) => {
      const auth = requireSession(request)
      if (auth instanceof Response) return auth
      if (!isWalletSlot(params.slot)) return notFound('Slot de carteira inexistente')
      const result = validateUpsert(await readBody(request))
      if (!result.ok) {
        return errorResponse(422, 'VALIDATION', 'Corpo inválido', result.fieldErrors)
      }
      return HttpResponse.json(upsertWallet(auth.user.id, params.slot, result.value))
    }),
  ),
  http.post(
    apiUrl('/wallet-connections'),
    withScenario('POST /wallet-connections', async ({ request }) => {
      const auth = requireSession(request)
      if (auth instanceof Response) return auth
      const { walletId, provider, network } = await readBody(request)
      if (!isWalletProvider(provider) || !isNetwork(network)) {
        return errorResponse(422, 'VALIDATION', 'Corpo inválido', {
          ...(isWalletProvider(provider) ? {} : { provider: 'Campo obrigatório' }),
          ...(isNetwork(network) ? {} : { network: 'Campo obrigatório' }),
        })
      }
      const wallet = getDb().wallets.find((w) => w.id === walletId && w.userId === auth.user.id)
      if (!wallet) return notFound('Carteira não encontrada')
      const body: WalletConnectionResponse = connectWallet(wallet, provider, network)
      return HttpResponse.json(body, { status: 201 })
    }),
  ),
  http.delete<{ id: string }>(
    apiUrl('/wallet-connections/:id'),
    withScenario('DELETE /wallet-connections/:id', ({ request, params }) => {
      const auth = requireSession(request)
      if (auth instanceof Response) return auth
      const db = getDb()
      const connection = db.walletConnections.find((c) => c.id === params.id)
      const owned = db.wallets.some(
        (w) => w.id === connection?.walletId && w.userId === auth.user.id,
      )
      if (!connection || !owned) return notFound('Conexão não encontrada')
      disconnectConnection(connection.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
