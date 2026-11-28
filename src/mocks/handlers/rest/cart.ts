import { http, HttpResponse } from 'msw'
import type { Cart, FieldErrors } from '@/contracts'
import {
  findCartLine,
  getOrCreateCart,
  removeCartLine,
  setCartLine,
  toCartItem,
  type CartOwner,
} from '../../db/cart'
import { getDb } from '../../db/store'
import {
  apiUrl,
  errorResponse,
  resolveGuestCartId,
  resolveSession,
  sessionError,
  withScenario,
} from '../util'

/** Com `Authorization` presente, falha de sessão nunca cai no carrinho de visitante. */
export function resolveOwner(request: Request): CartOwner | Response {
  if (request.headers.has('Authorization')) {
    const resolved = resolveSession(request)
    if (resolved) return `user:${resolved.user.id}`
    return sessionError(request)
  }
  const guestId = resolveGuestCartId(request)
  return guestId ? `guest:${guestId}` : unauthenticated()
}

const unauthenticated = (): Response =>
  errorResponse(401, 'UNAUTHENTICATED', 'Sessão ou carrinho não informado')
const notFound = (message: string): Response => errorResponse(404, 'NOT_FOUND', message)
const conflict = (): Response =>
  errorResponse(409, 'AVAILABILITY_CONFLICT', 'Quantidade acima da disponibilidade')

const validation = (fieldErrors: FieldErrors): Response =>
  errorResponse(422, 'VALIDATION', 'Corpo inválido', fieldErrors)

const isQuantity = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null)
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
}

function findEdition(nftId: string, editionId: string) {
  const nft = getDb().nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

const json = (cart: Cart): Response => HttpResponse.json(cart)

export const cartHandlers = [
  http.get(
    apiUrl('/cart'),
    withScenario('GET /cart', ({ request }) => {
      const owner = resolveOwner(request)
      return owner instanceof Response ? owner : json(getOrCreateCart(owner))
    }),
  ),
  http.post(
    apiUrl('/cart/items'),
    withScenario('POST /cart/items', async ({ request }) => {
      const owner = resolveOwner(request)
      if (owner instanceof Response) return owner
      const body = await readBody(request)
      const { nftId, editionId, quantity } = body
      const validId = (v: unknown): v is string => typeof v === 'string' && v !== ''
      if (!validId(nftId) || !validId(editionId) || !isQuantity(quantity)) {
        const fieldErrors: FieldErrors = {}
        if (!validId(nftId)) fieldErrors.nftId = 'NFT obrigatório'
        if (!validId(editionId)) fieldErrors.editionId = 'Edição obrigatória'
        if (!isQuantity(quantity)) fieldErrors.quantity = 'Quantidade deve ser um inteiro ≥ 1'
        return validation(fieldErrors)
      }

      const found = findEdition(nftId, editionId)
      if (!found) return notFound('NFT ou edição não encontrado')
      const current = findCartLine(getOrCreateCart(owner), found.nft.id, found.edition.id)
      const total = (current?.quantity ?? 0) + quantity
      if (total > found.edition.available) return conflict()
      return json(setCartLine(owner, toCartItem(found.nft, found.edition, total)))
    }),
  ),
  http.patch(
    apiUrl('/cart/items/:nftId/:editionId'),
    withScenario<{ nftId: string; editionId: string }>(
      'PATCH /cart/items/:nftId/:editionId',
      async ({ request, params }) => {
        const owner = resolveOwner(request)
        if (owner instanceof Response) return owner
        const { quantity } = await readBody(request)
        if (!isQuantity(quantity)) {
          return validation({ quantity: 'Quantidade deve ser um inteiro ≥ 1' })
        }
        const found = findEdition(params.nftId, params.editionId)
        if (!found || !findCartLine(getOrCreateCart(owner), params.nftId, params.editionId)) {
          return notFound('Item não encontrado no carrinho')
        }
        if (quantity > found.edition.available) return conflict()
        return json(setCartLine(owner, toCartItem(found.nft, found.edition, quantity)))
      },
    ),
  ),
  http.delete(
    apiUrl('/cart/items/:nftId/:editionId'),
    withScenario<{ nftId: string; editionId: string }>(
      'DELETE /cart/items/:nftId/:editionId',
      ({ request, params }) => {
        const owner = resolveOwner(request)
        if (owner instanceof Response) return owner
        if (!findCartLine(getOrCreateCart(owner), params.nftId, params.editionId)) {
          return notFound('Item não encontrado no carrinho')
        }
        return json(removeCartLine(owner, params.nftId, params.editionId))
      },
    ),
  ),
]
