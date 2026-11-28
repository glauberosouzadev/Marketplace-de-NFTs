import { describe, expect, it } from 'vitest'
import type { Collector, Wallet } from '@/contracts'
import { REQUIRED_MESSAGE, walletFormSchema } from '@/features/wallets/validation'
import { collectorDefaults, firstFocusableInvalid, toCollector } from './collector-values'

const wallet: Wallet = {
  id: 'w1',
  userId: 'u1',
  slot: 'primary',
  nickname: 'Principal',
  provider: 'metamask',
  network: 'ethereum',
  address: '0x1111111111111111111111111111111111111111',
  ensName: 'ana.eth',
  displayName: 'Ana',
  profileName: 'ana_profile',
  email: 'ana@kurio.test',
  referralCode: 'REF1',
}
const empty: Collector = { displayName: '', profileName: '', email: '' }

describe('collectorDefaults', () => {
  it('preenche tudo a partir da carteira escolhida', () => {
    const { values, useOtherWallet } = collectorDefaults(wallet, empty)
    expect(values).toMatchObject({
      displayName: 'Ana',
      nickname: 'Principal',
      network: 'ethereum',
      ensName: 'ana',
      email: 'ana@kurio.test',
    })
    expect(useOtherWallet).toBe(false)
  })

  it('sem "Usar outra carteira?" o contexto salvo não sobrescreve a carteira', () => {
    const { values } = collectorDefaults(wallet, { ...empty, displayName: 'Outro' })
    expect(values.displayName).toBe('Ana')
  })

  it('com "Usar outra carteira?" volta a edição pontual, mantendo o resto da carteira', () => {
    const saved = { ...empty, displayName: 'Outro', ensName: 'novo.eth', useOtherWallet: true }
    const { values, useOtherWallet } = collectorDefaults(wallet, saved)
    expect(useOtherWallet).toBe(true)
    expect(values).toMatchObject({ displayName: 'Outro', ensName: 'novo', email: 'ana@kurio.test' })
  })

  it('sem carteira começa vazio, com o que o usuário já digitou', () => {
    const { values } = collectorDefaults(null, { ...empty, email: 'x@kurio.test', note: 'oi' })
    expect(values.email).toBe('x@kurio.test')
    expect(values.address).toBe('')
  })
})

describe('toCollector', () => {
  const values = collectorDefaults(wallet, empty).values

  it('omite opcionais vazios e acrescenta .eth ao ENS', () => {
    expect(toCollector({ ...values, secondaryRef: ' ', referralCode: '' }, false, ' ')).toEqual({
      displayName: 'Ana',
      profileName: 'ana_profile',
      email: 'ana@kurio.test',
      ensName: 'ana.eth',
    })
  })

  it('leva nota, indicação e uso de outra carteira', () => {
    expect(toCollector(values, true, ' bom dia ')).toMatchObject({
      useOtherWallet: true,
      referralCode: 'REF1',
      note: 'bom dia',
    })
  })
})

describe('validação dos campos do layout', () => {
  const valid = collectorDefaults(wallet, empty).values
  const errorPaths = (input: typeof valid): string[] => {
    const result = walletFormSchema.safeParse(input)
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
  }

  it('obrigatório vazio é erro no campo; indicação e secundária são opcionais', () => {
    expect(errorPaths(valid)).toEqual([])
    expect(errorPaths({ ...valid, referralCode: '', secondaryRef: '' })).toEqual([])
    const result = walletFormSchema.safeParse({ ...valid, displayName: ' ', email: '' })
    expect(result.error?.issues.map((i) => i.message)).toContain(REQUIRED_MESSAGE)
    expect(errorPaths({ ...valid, displayName: ' ', email: '' })).toEqual(['displayName', 'email'])
  })
})

describe('firstFocusableInvalid', () => {
  it('trava: ignora campos da carteira e escolhe o primeiro editável', () => {
    expect(firstFocusableInvalid(new Set(['nickname', 'profileName', 'email']), true)).toBe(
      'profileName',
    )
  })

  it('destravado: usa a ordem visual, incluindo campos da carteira', () => {
    expect(firstFocusableInvalid(new Set(['email', 'nickname']), false)).toBe('nickname')
  })

  it('só travados inválidos: nenhum campo focável', () => {
    expect(firstFocusableInvalid(new Set(['address', 'ensName']), true)).toBeUndefined()
  })
})
