import { describe, expect, it, vi } from 'vitest'
import type { ApiError, Wallet } from '@/contracts'
import { applyApiError } from '@/features/session/form-errors'
import {
  EMPTY_WALLET_VALUES,
  INVALID_ADDRESS_MESSAGE,
  REQUIRED_MESSAGE,
  WALLET_FORM_FIELDS,
  isValidWalletAddress,
  toUpsertRequest,
  walletFormSchema,
  walletToFormValues,
  type WalletFormValues,
} from './validation'

const EVM = `0x${'a'.repeat(40)}`
const SOLANA = 'So11111111111111111111111111111111111111112'

const valid: WalletFormValues = {
  displayName: 'Ana',
  nickname: 'Principal',
  network: 'ethereum',
  address: EVM,
  provider: 'metamask',
  email: 'ana@kurio.test',
  profileName: 'ana',
  secondaryRef: '',
  referralCode: '',
  ensName: 'ana',
}

const errorsOf = (values: WalletFormValues) => {
  const result = walletFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]))
}

describe('isValidWalletAddress', () => {
  it.each([
    ['ethereum', EVM, true],
    ['polygon', EVM, true],
    ['ethereum', `0x${'a'.repeat(39)}`, false],
    ['polygon', `0x${'g'.repeat(40)}`, false],
    ['ethereum', SOLANA, false],
    ['solana', SOLANA, true],
    ['solana', 'abc', false],
    ['solana', EVM, false],
    ['solana', `0${SOLANA.slice(1)}`, false],
  ] as const)('%s com %s -> %s', (network, address, expected) => {
    expect(isValidWalletAddress(network, address)).toBe(expected)
  })
})

describe('walletFormSchema', () => {
  it('aceita o formulário completo com referral e secundária vazios', () => {
    expect(errorsOf(valid)).toEqual({})
  })

  it('vazio: só os campos com * são obrigatórios', () => {
    const errors = errorsOf(EMPTY_WALLET_VALUES)
    expect(Object.keys(errors).sort()).toEqual(
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
    expect(errors.network).toBe(REQUIRED_MESSAGE)
  })

  it('endereço fora do formato da rede cai no campo', () => {
    expect(errorsOf({ ...valid, address: SOLANA }).address).toBe(INVALID_ADDRESS_MESSAGE)
    expect(errorsOf({ ...valid, network: 'solana', address: SOLANA })).toEqual({})
  })

  it('endereço inválido é apontado mesmo com outro campo vazio', () => {
    const errors = errorsOf({ ...valid, address: 'x', displayName: '' })
    expect(errors.address).toBe(INVALID_ADDRESS_MESSAGE)
    expect(errors.displayName).toBe(REQUIRED_MESSAGE)
  })

  it('e-mail inválido', () => {
    expect(errorsOf({ ...valid, email: 'ana' }).email).toBe('Digite um e-mail válido')
  })
})

describe('conversões', () => {
  const wallet: Wallet = {
    id: 'w1',
    userId: 'u1',
    slot: 'primary',
    nickname: 'Principal',
    provider: 'coinbase',
    network: 'solana',
    address: SOLANA,
    ensName: 'ana.eth',
    displayName: 'Ana',
    profileName: 'ana',
    email: 'ana@kurio.test',
    referralCode: 'KUR1',
  }

  it('sem carteira devolve o formulário vazio', () => {
    expect(walletToFormValues(null)).toEqual(EMPTY_WALLET_VALUES)
  })

  it('pré-preenche separando o sufixo .eth', () => {
    expect(walletToFormValues(wallet)).toMatchObject({ ensName: 'ana', referralCode: 'KUR1' })
  })

  it('monta o request omitindo opcionais vazios', () => {
    expect(toUpsertRequest(valid)).toEqual({
      displayName: 'Ana',
      nickname: 'Principal',
      network: 'ethereum',
      address: EVM,
      provider: 'metamask',
      email: 'ana@kurio.test',
      profileName: 'ana',
      ensName: 'ana.eth',
    })
    expect(toUpsertRequest({ ...valid, referralCode: ' K1 ' })?.referralCode).toBe('K1')
  })

  it('rede ou tipo desconhecidos não geram request', () => {
    expect(toUpsertRequest({ ...valid, network: '' })).toBeNull()
  })
})

describe('erros 422 da API nos campos', () => {
  it('cada campo citado recebe a mensagem e o foco vai ao primeiro na ordem visual', () => {
    const error: ApiError = {
      kind: 'http',
      status: 422,
      code: 'VALIDATION',
      message: 'x',
      fieldErrors: {
        email: 'E-mail inválido',
        ensName: REQUIRED_MESSAGE,
        address: INVALID_ADDRESS_MESSAGE,
      },
    }
    const form = { setError: vi.fn(), setFocus: vi.fn() }
    expect(applyApiError<WalletFormValues>(form, error, WALLET_FORM_FIELDS)).toBeNull()
    expect(form.setError).toHaveBeenCalledTimes(3)
    expect(form.setFocus).toHaveBeenCalledWith('address')
  })
})
