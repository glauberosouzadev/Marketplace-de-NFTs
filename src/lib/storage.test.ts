import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearGuestCartId,
  clearOtherUsersStorage,
  clearUserStorage,
  getGuestCartId,
} from './storage'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size
      },
    },
  })
})

describe('clearGuestCartId', () => {
  it('remove o id e o próximo acesso gera outro', () => {
    const first = getGuestCartId()
    clearGuestCartId()
    expect(store.has('kurio:guestCartId')).toBe(false)
    expect(getGuestCartId()).not.toBe(first)
  })
})

function seedUsers(): void {
  store.set('kurio:session', JSON.stringify({ token: 't', uid: 'a' }))
  store.set('kurio:u:a:checkout', '{}')
  store.set('kurio:u:a:outro', '1')
  store.set('kurio:u:b:checkout', '{}')
  store.set('kurio:u:ab:checkout', '{}')
  store.set('kurio:guestCartId', 'g')
}

describe('clearUserStorage', () => {
  it('remove a sessão e só as chaves kurio:u:<uid>:*', () => {
    seedUsers()
    clearUserStorage('a')
    expect([...store.keys()].sort()).toEqual([
      'kurio:guestCartId',
      'kurio:u:ab:checkout',
      'kurio:u:b:checkout',
    ])
  })

  it('sem uid remove só a sessão', () => {
    seedUsers()
    clearUserStorage(null)
    expect(store.has('kurio:session')).toBe(false)
    expect(store.has('kurio:u:a:checkout')).toBe(true)
  })
})

describe('clearOtherUsersStorage', () => {
  it('mantém só o contexto do usuário que entrou', () => {
    seedUsers()
    clearOtherUsersStorage('b')
    expect([...store.keys()].filter((k) => k.startsWith('kurio:u:'))).toEqual([
      'kurio:u:b:checkout',
    ])
    expect(store.has('kurio:session')).toBe(true)
  })
})
