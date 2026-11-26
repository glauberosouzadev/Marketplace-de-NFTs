import { SCHEMA_VERSION, type DbSlice, type DbState } from './types'

const MOCK_PREFIX = 'kurio-mock:'
const APP_PREFIX = 'kurio:'
const keyOf = (slice: DbSlice): string => `${MOCK_PREFIX}${slice}`

const SLICES: readonly DbSlice[] = [
  'users',
  'collections',
  'nfts',
  'wallets',
  'walletConnections',
  'coupons',
  'sessions',
  'carts',
  'orders',
  'favorites',
  'meta',
]

function storage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function saveState(state: DbState): void {
  const store = storage()
  if (!store) return
  for (const slice of SLICES) store.setItem(keyOf(slice), JSON.stringify(state[slice]))
}

/** Restaura do `kurio-mock:*`; devolve `null` se faltar alguma fatia ou houver JSON inválido. */
export function loadState(): DbState | null {
  const store = storage()
  if (!store) return null
  try {
    const entries = SLICES.map((slice) => {
      const raw = store.getItem(keyOf(slice))
      if (raw === null) throw new Error(`fatia ausente: ${slice}`)
      return [slice, JSON.parse(raw) as unknown] as const
    })
    const loaded = Object.fromEntries(entries) as unknown as DbState
    return loaded.meta.schemaVersion === SCHEMA_VERSION ? loaded : null
  } catch {
    return null
  }
}

export function clearPersisted(): void {
  const store = storage()
  if (!store) return
  const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter(
    (k): k is string => k !== null && (k.startsWith(MOCK_PREFIX) || k.startsWith(APP_PREFIX)),
  )
  for (const key of keys) store.removeItem(key)
}
