/** Único ponto de acesso ao localStorage (TSD-10). Chaves `kurio:*`. */
export interface StoredSession {
  token: string
  uid: string
}

const KEYS = {
  guestCartId: 'kurio:guestCartId',
  session: 'kurio:session',
} as const

const checkoutKey = (uid: string): string => `kurio:u:${uid}:checkout`

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

export function getGuestCartId(): string {
  const existing = read(KEYS.guestCartId)
  if (existing) return existing
  const id = crypto.randomUUID()
  write(KEYS.guestCartId, id)
  return id
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
