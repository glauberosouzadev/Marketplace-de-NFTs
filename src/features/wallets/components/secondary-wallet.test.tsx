import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Wallet } from '@/contracts'

vi.mock('./wallet-form', () => ({
  WalletForm: (props: { slot: string; wallet: Wallet | null }) => (
    <form data-slot={props.slot} data-filled={String(props.wallet !== null)} />
  ),
}))

import { NO_PRIMARY_NOTICE, SecondaryWallet, resolveCopy } from './secondary-wallet'

const primary = { nickname: 'Principal' } as Wallet

describe('SecondaryWallet', () => {
  it('sem carteira: estado vazio com "Adicionar", controle de cópia e sem formulário', () => {
    const html = renderToStaticMarkup(<SecondaryWallet uid="u1" wallet={null} primary={primary} />)
    expect(html).toContain('Você ainda não adicionou uma carteira secundária.')
    expect(html).toContain('Adicionar')
    expect(html).toContain('<button type="button"')
    expect(html).toContain('Igual à carteira principal')
    expect(html).not.toContain('<form')
  })

  it('com carteira: formulário do slot secondary preenchido, sem estado vazio', () => {
    const html = renderToStaticMarkup(
      <SecondaryWallet uid="u1" wallet={{} as Wallet} primary={primary} />,
    )
    expect(html).toContain('data-slot="secondary"')
    expect(html).toContain('data-filled="true"')
    expect(html).not.toContain('Você ainda não adicionou')
  })

  it('resolveCopy: com principal copia a carteira, sem aviso', () => {
    expect(resolveCopy(primary)).toEqual({ copied: primary, notice: '' })
  })

  it('resolveCopy: sem principal não copia e devolve o aviso', () => {
    expect(resolveCopy(null)).toEqual({ copied: null, notice: NO_PRIMARY_NOTICE })
  })
})
