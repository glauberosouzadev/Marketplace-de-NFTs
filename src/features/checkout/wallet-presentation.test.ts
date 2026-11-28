import { describe, expect, it } from 'vitest'
import type { Wallet } from '@/contracts'
import {
  abbreviateAddress,
  walletList,
  walletNetworkText,
  walletReference,
} from './wallet-presentation'

const make = (patch: Partial<Wallet>): Wallet => ({
  id: 'w',
  userId: 'u',
  slot: 'primary',
  nickname: 'n',
  provider: 'metamask',
  network: 'ethereum',
  address: '0xA91F000000000000000000000000000000E82C',
  displayName: 'd',
  profileName: 'p',
  email: 'e@e.co',
  ...patch,
})

describe('wallet-presentation', () => {
  it('abrevia o endereço e mantém curtos inteiros', () => {
    expect(abbreviateAddress('0xA91F000000000000000000000000000000E82C')).toBe('0xA91F…E82C')
    expect(abbreviateAddress('0xabc')).toBe('0xabc')
  })

  it('prefere o ENS ao endereço', () => {
    expect(walletReference(make({ ensName: 'nova.kurio.eth' }))).toBe('nova.kurio.eth')
    expect(walletReference(make({}))).toBe('0xA91F…E82C')
  })

  it('texto de rede segue o Figma por carteira', () => {
    expect(walletNetworkText(make({}))).toBe('Rede principal Ethereum')
    expect(walletNetworkText(make({ slot: 'secondary', network: 'polygon' }))).toBe('Rede Polygon')
  })

  it('lista principal antes da secundária e omite ausentes', () => {
    const a = make({ id: 'a' })
    const b = make({ id: 'b', slot: 'secondary' })
    expect(walletList({ primary: a, secondary: b })).toEqual([a, b])
    expect(walletList({ primary: null, secondary: b })).toEqual([b])
    expect(walletList({ primary: null, secondary: null })).toEqual([])
  })
})
