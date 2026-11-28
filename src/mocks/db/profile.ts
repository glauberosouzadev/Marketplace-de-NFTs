import type { ErrorCode, FieldErrors, Profile, UpdateProfileRequest } from '@/contracts'
import { hashPassword, verifyPassword } from './password'
import { getDb, mutateDb, nextVersion } from './store'
import type { DbState, MockUser } from './types'
import { EMAIL_PATTERN, REQUIRED_MESSAGE, text } from './wallets'

const REQUIRED_FIELDS = ['displayName', 'username', 'email', 'ensName'] as const
const PASSWORD_POLICY_MESSAGE = 'Mínimo de 8 caracteres com letra e número'

export type ProfileValidation =
  { ok: true; value: UpdateProfileRequest } | { ok: false; fieldErrors: FieldErrors }

export interface ProfileConflict {
  code: Extract<ErrorCode, 'EMAIL_TAKEN' | 'USERNAME_TAKEN'>
  fieldErrors: FieldErrors
}

export type ProfileUpdate =
  | { ok: true; profile: Profile }
  | { ok: false; conflict: ProfileConflict }
  | { ok: false; fieldErrors: FieldErrors }

const primaryWallet = (db: DbState, userId: string) =>
  db.wallets.find((w) => w.userId === userId && w.slot === 'primary')

/** `walletNickname` vem sempre da carteira principal (fonte única, Q-09). */
export function toProfile(db: DbState, user: MockUser): Profile {
  const { displayName, username, email, ensName, avatarUrl } = user
  return {
    displayName,
    username,
    email,
    ensName,
    walletNickname: primaryWallet(db, user.id)?.nickname ?? '',
    ...(avatarUrl ? { avatarUrl } : {}),
  }
}

export function getProfile(userId: string): Profile | null {
  const db = getDb()
  const user = db.users.find((u) => u.id === userId)
  return user ? toProfile(db, user) : null
}

export function validateProfile(body: Record<string, unknown>): ProfileValidation {
  const value: UpdateProfileRequest = {
    displayName: text(body.displayName),
    username: text(body.username),
    email: text(body.email).toLowerCase(),
    ensName: text(body.ensName),
    walletNickname: text(body.walletNickname),
  }
  const fieldErrors: FieldErrors = {}
  for (const field of REQUIRED_FIELDS) {
    if (value[field] === '') fieldErrors[field] = REQUIRED_MESSAGE
  }
  if (value.email !== '' && !EMAIL_PATTERN.test(value.email)) {
    fieldErrors.email = 'Digite um e-mail válido'
  }
  if (value.ensName !== '' && !value.ensName.endsWith('.eth')) {
    fieldErrors.ensName = 'Nome ENS deve terminar em .eth'
  }
  return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: true, value }
}

/** Compara só com as outras contas, sem diferenciar maiúsculas. */
export function findConflict(
  users: readonly MockUser[],
  userId: string,
  value: Pick<UpdateProfileRequest, 'email' | 'username'>,
): ProfileConflict | null {
  const others = users.filter((u) => u.id !== userId)
  const emailTaken = others.some((u) => u.email.toLowerCase() === value.email.toLowerCase())
  const usernameTaken = others.some(
    (u) => u.username.toLowerCase() === value.username.toLowerCase(),
  )
  if (!emailTaken && !usernameTaken) return null
  const fieldErrors: FieldErrors = {}
  if (emailTaken) fieldErrors.email = 'E-mail já cadastrado'
  if (usernameTaken) fieldErrors.username = 'Usuário já em uso'
  return { code: emailTaken ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN', fieldErrors }
}

/** Grava os dados no `User` (versão +1) e o apelido no `Wallet.nickname` do slot `primary`. */
export function updateProfile(userId: string, value: UpdateProfileRequest): ProfileUpdate {
  return mutateDb((db): ProfileUpdate => {
    const user = db.users.find((u) => u.id === userId)
    if (!user) return { ok: false, fieldErrors: {} }
    const conflict = findConflict(db.users, userId, value)
    if (conflict) return { ok: false, conflict }
    const wallet = primaryWallet(db, userId)
    if (value.walletNickname !== '' && !wallet) {
      return {
        ok: false,
        fieldErrors: { walletNickname: 'Cadastre a carteira principal antes' },
      }
    }
    // A carteira exige `nickname` (wallets.ts); sem ela, vazio é aceito.
    if (value.walletNickname === '' && wallet) {
      return { ok: false, fieldErrors: { walletNickname: REQUIRED_MESSAGE } }
    }
    user.displayName = value.displayName
    user.username = value.username
    user.email = value.email
    user.ensName = value.ensName
    user.version = nextVersion(user.version)
    if (wallet) wallet.nickname = value.walletNickname
    return { ok: true, profile: toProfile(db, user) }
  })
}

const isStrongPassword = (value: string): boolean =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)

const randomSalt = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

/** Troca a senha guardando só hash + salt novos (RN-15). Devolve `fieldErrors` vazio no sucesso. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<FieldErrors> {
  const user = getDb().users.find((u) => u.id === userId)
  const fieldErrors: FieldErrors = {}
  if (currentPassword === '') fieldErrors.currentPassword = REQUIRED_MESSAGE
  if (!isStrongPassword(newPassword)) fieldErrors.newPassword = PASSWORD_POLICY_MESSAGE
  else if (newPassword === currentPassword) {
    fieldErrors.newPassword = 'A nova senha deve ser diferente da atual'
  }
  if (!user) return { ...fieldErrors, currentPassword: 'Senha atual incorreta' }
  if (
    currentPassword !== '' &&
    !(await verifyPassword(currentPassword, user.salt, user.passwordHash))
  ) {
    fieldErrors.currentPassword = 'Senha atual incorreta'
  }
  if (Object.keys(fieldErrors).length > 0) return fieldErrors

  const salt = randomSalt()
  const passwordHash = await hashPassword(newPassword, salt)
  mutateDb((db) => {
    const stored = db.users.find((u) => u.id === userId)
    if (stored) Object.assign(stored, { salt, passwordHash })
  })
  return {}
}
