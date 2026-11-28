import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, resetDb } from './store'
import {
  connectWallet,
  disconnectConnection,
  isValidAddress,
  rejectNextConnection,
  upsertWallet,
  validateUpsert,
} from './wallets'

const VALID = {
  displayName: 'Ana',
  nickname: 'Principal',
  profileName: 'ana',
  email: 'ana@kurio.test',
  provider: 'metamask',
  network: 'ethereum',
  address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  ensName: 'ana.eth',
}

beforeEach(() => {
  resetDb()
})

describe('validateUpsert: ensName', () => {
  it('rejeita nome sem o sufixo .eth em fieldErrors.ensName', () => {
    const result = validateUpsert({ ...VALID, ensName: 'ana' })
    expect(result).toMatchObject({ ok: false, fieldErrors: { ensName: expect.any(String) } })
  })

  it('vazio segue como obrigatório e com sufixo é aceito', () => {
    expect(validateUpsert({ ...VALID, ensName: '' })).toMatchObject({
      fieldErrors: { ensName: 'Campo obrigatório' },
    })
    expect(validateUpsert(VALID).ok).toBe(true)
  })
})

describe('isValidAddress (Q-29)', () => {
  it.each(['ethereum', 'polygon'] as const)('%s exige 0x + 40 hex', (network) => {
    expect(isValidAddress(network, VALID.address)).toBe(true)
    expect(isValidAddress(network, '0x123')).toBe(false)
    expect(isValidAddress(network, VALID.address.slice(2))).toBe(false)
    expect(isValidAddress(network, `0x${'g'.repeat(40)}`)).toBe(false)
  })

  it('solana exige base58 de 32 a 44 caracteres', () => {
    expect(isValidAddress('solana', '7Xk9aQ2mPzR4tVb8NcLfH3yJdWe6SgUo1ZiA5nMhKqTp')).toBe(true)
    expect(isValidAddress('solana', 'abc')).toBe(false)
    expect(isValidAddress('solana', `0${'a'.repeat(40)}`)).toBe(false)
    expect(isValidAddress('solana', VALID.address)).toBe(false)
  })
})

describe('validateUpsert', () => {
  it('aceita referralCode vazio e o omite', () => {
    const result = validateUpsert({ ...VALID, referralCode: '' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).not.toHaveProperty('referralCode')
  })

  it('obrigatórios vazios geram erro por campo', () => {
    const result = validateUpsert({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual(
        [
          'address',
          'displayName',
          'email',
          'ensName',
          'network',
          'nickname',
          'profileName',
          'provider',
        ].sort(),
      )
    }
  })

  it('endereço inválido para a rede e e-mail malformado', () => {
    const result = validateUpsert({ ...VALID, network: 'solana', email: 'x' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.fieldErrors).sort()).toEqual(['address', 'email'])
  })
})

describe('upsertWallet', () => {
  it('regrava o slot existente mantendo o id', () => {
    const before = getDb().wallets.find((w) => w.userId === 'user-001' && w.slot === 'primary')!
    const result = validateUpsert({ ...VALID, nickname: 'Nova' })
    if (!result.ok) throw new Error('payload inválido')
    const saved = upsertWallet('user-001', 'primary', result.value)
    expect(saved.id).toBe(before.id)
    expect(getDb().wallets.filter((w) => w.userId === 'user-001')).toHaveLength(2)
    expect(getDb().wallets.find((w) => w.id === before.id)?.nickname).toBe('Nova')
  })

  it('cria carteira com id novo quando o slot está vazio', () => {
    const result = validateUpsert(VALID)
    if (!result.ok) throw new Error('payload inválido')
    const saved = upsertWallet('user-002', 'secondary', result.value)
    expect(saved.id).toBe('wallet-004')
    expect(saved.userId).toBe('user-002')
  })
})

describe('conexões', () => {
  const wallet = () => getDb().wallets.find((w) => w.id === 'wallet-001')!

  it('conecta por padrão e recusa só a próxima após rejectNextConnection', () => {
    rejectNextConnection()
    expect(connectWallet(wallet(), 'metamask', 'ethereum').status).toBe('rejected')
    expect(connectWallet(wallet(), 'metamask', 'ethereum').status).toBe('connected')
  })

  it('resetDb limpa a recusa pendente', () => {
    rejectNextConnection()
    resetDb()
    expect(connectWallet(wallet(), 'metamask', 'ethereum').status).toBe('connected')
  })

  it('reconectar mantém uma conexão por carteira', () => {
    const connection = connectWallet(wallet(), 'metamask', 'ethereum')
    expect(connection.id).toBe('conn-001')
    expect(getDb().walletConnections.filter((c) => c.walletId === 'wallet-001')).toHaveLength(1)
  })

  it('disconnectConnection marca disconnected e informa se existia', () => {
    expect(disconnectConnection('conn-001')).toBe(true)
    expect(getDb().walletConnections.find((c) => c.id === 'conn-001')?.status).toBe('disconnected')
    expect(disconnectConnection('conn-999')).toBe(false)
  })
})
