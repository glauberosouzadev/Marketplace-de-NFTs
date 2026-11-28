import { useId } from 'react'
import { Link } from '@tanstack/react-router'
import { MoreVertical } from 'lucide-react'
import type { Wallet } from '@/contracts'
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group'
import { CHECKOUT_PATH } from '@/features/quote/presentation'
import { slotLabel, walletNetworkText, walletReference } from '../wallet-presentation'

interface WalletPickerProps {
  wallets: readonly Wallet[]
  selectedId: string | null
  connected: boolean
  onSelect: (wallet: Wallet) => void
}

const LINK_CLASS =
  'text-price focus-visible:ring-ring text-sm font-bold outline-none focus-visible:ring-2'

function EditWalletLink({ wallet }: { wallet: Wallet }) {
  return (
    <Link
      to="/carteiras"
      search={{ redirect: CHECKOUT_PATH }}
      aria-label={`Editar carteira ${wallet.nickname}`}
      className="text-price focus-visible:ring-ring grid size-10 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2"
    >
      <MoreVertical aria-hidden className="size-5" />
    </Link>
  )
}

function WalletCard({ wallet, inputId }: { wallet: Wallet; inputId: string }) {
  return (
    <div className="bg-card flex items-center gap-2 rounded-3xl px-4 py-3 lg:rounded-md">
      <label htmlFor={inputId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <RadioGroupItem id={inputId} value={wallet.id} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2 text-base font-bold">
            {wallet.nickname}
            <span className="text-muted-foreground text-xs font-normal">
              {slotLabel(wallet.slot)}
            </span>
          </span>
          <span className="text-muted-foreground text-sm break-all">{walletReference(wallet)}</span>
          <span className="text-muted-foreground text-sm">{walletNetworkText(wallet)}</span>
        </span>
      </label>
      <EditWalletLink wallet={wallet} />
    </div>
  )
}

/** FR-28: carteiras cadastradas; sem nenhuma, link para Carteiras. */
export function WalletPicker({ wallets, selectedId, connected, onSelect }: WalletPickerProps) {
  const groupId = useId()
  const other = wallets.length > 1 ? wallets.find((wallet) => wallet.id !== selectedId) : undefined

  return (
    <section aria-labelledby={groupId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={groupId} className="text-base font-bold">
          {connected ? 'Carteira conectada' : 'Carteira'}
        </h2>
        {other && (
          <button type="button" onClick={() => onSelect(other)} className={LINK_CLASS}>
            Trocar carteira
          </button>
        )}
      </div>
      {wallets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Você ainda não tem carteira cadastrada.{' '}
          <Link to="/carteiras" search={{ redirect: CHECKOUT_PATH }} className={LINK_CLASS}>
            Cadastrar carteira
          </Link>
        </p>
      ) : (
        <RadioGroup
          aria-labelledby={groupId}
          value={selectedId ?? ''}
          onValueChange={(id) => {
            const wallet = wallets.find((item) => item.id === id)
            if (wallet) onSelect(wallet)
          }}
        >
          {wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} inputId={`${groupId}-${wallet.id}`} />
          ))}
        </RadioGroup>
      )}
    </section>
  )
}
