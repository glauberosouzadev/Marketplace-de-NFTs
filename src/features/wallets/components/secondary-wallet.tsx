import { useState } from 'react'
import type { Wallet } from '@/contracts'
import { WalletForm } from './wallet-form'

const LINK_BUTTON =
  'text-primary focus-visible:ring-ring text-sm font-bold outline-none focus-visible:ring-2'

export const NO_PRIMARY_NOTICE = 'Cadastre a carteira principal primeiro.'

/** Copiar só preenche o formulário; sem principal, nada é copiado e o aviso é anunciado. */
export function resolveCopy(primary: Wallet | null) {
  return primary ? { copied: primary, notice: '' } : { copied: null, notice: NO_PRIMARY_NOTICE }
}

interface SecondaryWalletProps {
  uid: string
  wallet: Wallet | null
  primary: Wallet | null
}

export function SecondaryWallet({ uid, wallet, primary }: SecondaryWalletProps) {
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState<Wallet | null>(null)
  const [notice, setNotice] = useState('')
  const showForm = wallet !== null || adding || copied !== null

  const copyPrimary = () => {
    const result = resolveCopy(primary)
    setNotice(result.notice)
    if (result.copied) setCopied(result.copied)
  }

  return (
    <section aria-labelledby="secondary-title" className="grid gap-6">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="secondary-title" className="text-lg font-bold">
            Carteira secundária
          </h2>
          {!showForm && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="focus-visible:ring-ring flex items-center gap-2 text-sm outline-none focus-visible:ring-2"
                onClick={copyPrimary}
              >
                <span aria-hidden className="border-primary size-4 rounded-full border-2" />
                Igual à carteira principal
              </button>
              <button type="button" className={LINK_BUTTON} onClick={() => setAdding(true)}>
                Adicionar
              </button>
            </div>
          )}
        </div>
        <p role="status" className="text-destructive text-sm empty:hidden">
          {notice}
        </p>
        {!showForm && (
          <p className="text-muted-foreground text-sm">
            Você ainda não adicionou uma carteira secundária.
          </p>
        )}
      </div>
      {showForm && (
        <WalletForm
          uid={uid}
          slot="secondary"
          wallet={wallet ?? copied}
          focusOnMount={adding || copied !== null}
        />
      )}
    </section>
  )
}
