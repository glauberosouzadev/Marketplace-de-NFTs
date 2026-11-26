import { beforeEach, describe, expect, it } from 'vitest'
import { loadState, saveState } from './persist'
import { verifyPassword } from './password'
import { buildSeed } from './seed'
import { getDb, mutateDb, resetDb } from './store'

describe('seed', () => {
  it('é determinístico e cumpre a variedade exigida', () => {
    const a = buildSeed()
    expect(buildSeed()).toEqual(a)
    expect(a.nfts.length).toBeGreaterThanOrEqual(40)
    expect(new Set(a.nfts.map((n) => n.id)).size).toBe(a.nfts.length)
    expect(new Set(a.nfts.map((n) => n.tokenId)).size).toBe(a.nfts.length)
    expect(a.collections).toHaveLength(9)
    expect(a.nfts.some((n) => n.editions.some((e) => e.soldOut))).toBe(true)
    expect(a.nfts.some((n) => n.collection.id === 'utilidade' && n.network === 'solana')).toBe(
      false,
    )
    expect(a.users.length).toBeGreaterThanOrEqual(2)
    expect(a.orders).toEqual([])
  })

  it('cobre toda coleção e rede, os 9 NFTs do Figma e a faixa de preço', () => {
    const { nfts, collections } = buildSeed()
    for (const c of collections) expect(nfts.some((n) => n.collection.id === c.id)).toBe(true)
    for (const net of ['ethereum', 'polygon', 'solana'])
      expect(nfts.some((n) => n.network === net)).toBe(true)
    expect(nfts.slice(0, 9).map((n) => n.priceFrom)).toEqual([
      '1.19',
      '1.69',
      '1.99',
      '1.29',
      '1.39',
      '1.79',
      '0.99',
      '0.59',
      '0.39',
    ])
    expect(nfts[2]?.badges).toContain('RARO')
    const prices = nfts.map((n) => Number(n.priceFrom))
    expect(Math.min(...prices)).toBe(0.02)
    expect(Math.max(...prices)).toBe(12.3)
  })

  it('guarda só hash da senha', async () => {
    const [ana] = buildSeed().users
    expect(await verifyPassword('Kurio@2026', ana?.salt ?? '', ana?.passwordHash ?? '')).toBe(true)
    expect(JSON.stringify(buildSeed())).not.toContain('Kurio@2026')
  })
})

describe('store', () => {
  const memory = new Map<string, string>()
  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        get length() {
          return memory.size
        },
        key: (i: number) => Array.from(memory.keys())[i] ?? null,
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => void memory.set(k, v),
        removeItem: (k: string) => void memory.delete(k),
      },
    })
    resetDb()
  })

  it('persiste mutações e resetDb restaura o seed e limpa as chaves', () => {
    mutateDb((db) => {
      db.favorites.push({
        userId: 'user-001',
        nftId: 'nft-001',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
    })
    expect(memory.get('kurio-mock:favorites')).toContain('nft-001')
    resetDb()
    expect(memory.size).toBe(0)
    expect(getDb().favorites).toEqual([])
    expect(getDb()).toEqual(buildSeed())
  })

  it('restaura do storage após alterar', () => {
    mutateDb((db) => {
      db.meta.scenario = 'alterado'
    })
    expect(loadState()?.meta.scenario).toBe('alterado')
  })

  it('ignora JSON inválido e versão de esquema diferente', () => {
    memory.set('kurio-mock:users', '{invalido')
    expect(loadState()).toBeNull()
    saveState(buildSeed())
    memory.set('kurio-mock:meta', JSON.stringify({ eventSeq: 0, scenario: 'x', schemaVersion: 0 }))
    expect(loadState()).toBeNull()
  })

  it('mutação que lança não altera memória nem storage', () => {
    const before = memory.get('kurio-mock:meta')
    expect(() =>
      mutateDb((db) => {
        db.meta.scenario = 'x'
        throw new Error('falha')
      }),
    ).toThrow()
    expect(getDb().meta.scenario).toBe('default')
    expect(memory.get('kurio-mock:meta')).toBe(before)
  })
})
