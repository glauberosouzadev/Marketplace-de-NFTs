import { http, HttpResponse } from 'msw'
import type { AuthResponse, FieldErrors, SessionResponse, User } from '@/contracts'
import { mergeGuestCart } from '../../db/merge-cart'
import { hashPassword, verifyPassword } from '../../db/password'
import { getDb, mutateDb } from '../../db/store'
import type { DbState, MockUser } from '../../db/types'
import { apiUrl, errorResponse, resolveSession, withScenario } from '../util'
import { readBody } from './cart'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Salt fixo só para gastar o mesmo PBKDF2 quando o e-mail não existe (resposta indistinguível). */
const DUMMY_SALT = '6b7572696f2d64756d6d79'

const randomHex = (bytes: number): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const normalizeEmail = (value: unknown): string => text(value).toLowerCase()
const isStrongPassword = (value: string): boolean =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)

function toPublicUser(user: MockUser): User {
  const { id, username, email, displayName, ensName, avatarUrl, version } = user
  return { id, username, email, displayName, ensName, version, ...(avatarUrl ? { avatarUrl } : {}) }
}

const validation = (fieldErrors: FieldErrors): Response =>
  errorResponse(422, 'VALIDATION', 'Corpo inválido', fieldErrors)

const invalidCredentials = (): Response =>
  errorResponse(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos')

function bearerToken(request: Request): string | undefined {
  return /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1]
}

/** Cria a sessão e funde o carrinho do visitante na mesma mutação. */
function openSession(db: DbState, user: MockUser, guestCartId: string): AuthResponse {
  const session = {
    token: randomHex(32),
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  db.sessions.push(session)
  const cartAdjustments = guestCartId ? mergeGuestCart(db, guestCartId, user.id) : []
  return {
    session: { token: session.token, expiresAt: session.expiresAt },
    user: toPublicUser(user),
    cartAdjustments,
  }
}

function validateRegister(username: string, email: string, password: string): FieldErrors {
  const fieldErrors: FieldErrors = {}
  if (username === '') fieldErrors.username = 'Usuário obrigatório'
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = 'E-mail inválido'
  if (!isStrongPassword(password)) {
    fieldErrors.password = 'Mínimo de 8 caracteres com letra e número'
  }
  return fieldErrors
}

function takenConflict(users: MockUser[], username: string, email: string): Response | null {
  const emailTaken = users.some((u) => u.email.toLowerCase() === email)
  const usernameTaken = users.some((u) => u.username.toLowerCase() === username.toLowerCase())
  if (!emailTaken && !usernameTaken) return null
  const fieldErrors: FieldErrors = {}
  if (emailTaken) fieldErrors.email = 'E-mail já cadastrado'
  if (usernameTaken) fieldErrors.username = 'Usuário já em uso'
  return emailTaken
    ? errorResponse(409, 'EMAIL_TAKEN', 'E-mail já cadastrado', fieldErrors)
    : errorResponse(409, 'USERNAME_TAKEN', 'Usuário já em uso', fieldErrors)
}

const nextUserId = (users: MockUser[]): string =>
  `user-${String(users.length + 1).padStart(3, '0')}`

export const authHandlers = [
  http.post(
    apiUrl('/auth/register'),
    withScenario('POST /auth/register', async ({ request }) => {
      const body = await readBody(request)
      const username = text(body.username)
      const email = normalizeEmail(body.email)
      const password = typeof body.password === 'string' ? body.password : ''
      const fieldErrors = validateRegister(username, email, password)
      if (Object.keys(fieldErrors).length > 0) return validation(fieldErrors)
      const conflict = takenConflict(getDb().users, username, email)
      if (conflict) return conflict

      const salt = randomHex(16)
      const passwordHash = await hashPassword(password, salt)
      // Revalida dentro da mutação: outro cadastro pode ter entrado durante o PBKDF2.
      const result = mutateDb((db) => {
        const raced = takenConflict(db.users, username, email)
        if (raced) return raced
        const user: MockUser = {
          id: nextUserId(db.users),
          username,
          email,
          displayName: username,
          ensName: '',
          version: 1,
          salt,
          passwordHash,
        }
        db.users.push(user)
        return openSession(db, user, text(body.guestCartId))
      })
      return result instanceof Response ? result : HttpResponse.json(result, { status: 201 })
    }),
  ),
  http.post(
    apiUrl('/auth/login'),
    withScenario('POST /auth/login', async ({ request }) => {
      const body = await readBody(request)
      const email = normalizeEmail(body.email)
      const password = typeof body.password === 'string' ? body.password : ''
      const fieldErrors: FieldErrors = {}
      if (!EMAIL_PATTERN.test(email)) fieldErrors.email = 'E-mail inválido'
      if (password === '') fieldErrors.password = 'Senha obrigatória'
      if (Object.keys(fieldErrors).length > 0) return validation(fieldErrors)

      const user = getDb().users.find((u) => u.email.toLowerCase() === email)
      const valid = user
        ? await verifyPassword(password, user.salt, user.passwordHash)
        : await hashPassword(password, DUMMY_SALT).then(() => false)
      if (!user || !valid) return invalidCredentials()
      return HttpResponse.json(mutateDb((db) => openSession(db, user, text(body.guestCartId))))
    }),
  ),
  http.get(
    apiUrl('/auth/session'),
    withScenario('GET /auth/session', ({ request }) => {
      const resolved = resolveSession(request)
      if (resolved) {
        const body: SessionResponse = {
          user: toPublicUser(resolved.user),
          expiresAt: resolved.session.expiresAt,
        }
        return HttpResponse.json(body)
      }
      const token = bearerToken(request)
      return getDb().sessions.some((s) => s.token === token)
        ? errorResponse(401, 'SESSION_EXPIRED', 'Sessão expirada')
        : errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida')
    }),
  ),
  http.post(
    apiUrl('/auth/logout'),
    withScenario('POST /auth/logout', ({ request }) => {
      const token = bearerToken(request)
      if (token && getDb().sessions.some((s) => s.token === token)) {
        mutateDb((db) => {
          db.sessions = db.sessions.filter((s) => s.token !== token)
        })
      }
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
