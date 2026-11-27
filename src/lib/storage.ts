/** Único ponto de acesso ao localStorage (TSD-10). Chaves `kurio:*`. */
export interface StoredSession {
  token: string
  uid: string
}

const KEYS = {
  guestCartId: 'kurio:guestCartId',
  session: 'kurio:session',
} as const

const USER_PREFIX = 'kurio:u:'
const userPrefix = (uid: string): string => `${USER_PREFIX}${uid}:`
const checkoutKey = (uid: string): string => `${userPrefix(uid)}checkout`

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // armazenamento indisponível: segue sem persistir
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignorado
  }
}

function keysMatching(match: (key: string) => boolean): string[] {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key !== null && match(key)) keys.push(key)
    }
    return keys
  } catch {
    return []
  }
}

export function getGuestCartId(): string {
  const existing = read(KEYS.guestCartId)
  if (existing) return existing
  const id = crypto.randomUUID()
  write(KEYS.guestCartId, id)
  return id
}

/** Após o merge no login/cadastro; o próximo visitante ganha novo id sob demanda. */
export function clearGuestCartId(): void {
  remove(KEYS.guestCartId)
}

export function getSession(): StoredSession | null {
  const raw = read(KEYS.session)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (typeof parsed.token === 'string' && typeof parsed.uid === 'string') {
      return { token: parsed.token, uid: parsed.uid }
    }
  } catch {
    // JSON inválido
  }
  return null
}

export function setSession(session: StoredSession): void {
  write(KEYS.session, JSON.stringify(session))
}

export function clearSession(): void {
  remove(KEYS.session)
}

export function getCheckoutDraft(uid: string): string | null {
  return read(checkoutKey(uid))
}

export function setCheckoutDraft(uid: string, value: string): void {
  write(checkoutKey(uid), value)
}

export function clearCheckoutDraft(uid: string): void {
  remove(checkoutKey(uid))
}

/** Logout/troca de usuário (SDD-07): sessão e todo `kurio:u:<uid>:*`. */
export function clearUserStorage(uid: string | null): void {
  clearSession()
  if (uid === null) return
  const prefix = userPrefix(uid)
  keysMatching((key) => key.startsWith(prefix)).forEach(remove)
}

/** No login: descarta o contexto de outros usuários (ex.: deixado por uma expiração). */
export function clearOtherUsersStorage(uid: string): void {
  const own = userPrefix(uid)
  keysMatching((key) => key.startsWith(USER_PREFIX) && !key.startsWith(own)).forEach(remove)
}
