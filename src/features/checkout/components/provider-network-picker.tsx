import { useId } from 'react'
import { Wallet } from 'lucide-react'
import type { Network, WalletProvider } from '@/contracts'
import {
  NETWORK_OPTIONS,
  PROVIDER_OPTIONS,
  isNetwork,
  isWalletProvider,
} from '@/features/wallets/validation'
import { Label } from '@/ui/label'
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'

interface ProviderNetworkPickerProps {
  provider: WalletProvider | null
  network: Network | null
  onProviderChange: (provider: WalletProvider) => void
  onNetworkChange: (network: Network) => void
}

const INITIAL: Partial<Record<WalletProvider, string>> = { walletconnect: 'W', metamask: 'M' }

function ProviderBadge({ provider }: { provider: WalletProvider }) {
  const initial = INITIAL[provider]
  return (
    <span
      aria-hidden
      className="bg-secondary text-primary grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold lg:hidden"
    >
      {initial ?? <Wallet className="size-5" />}
    </span>
  )
}

/** FR-29: provedor (radios) e rede da conexão (select). */
export function ProviderNetworkPicker({
  provider,
  network,
  onProviderChange,
  onNetworkChange,
}: ProviderNetworkPickerProps) {
  const headingId = useId()
  const networkId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-bold">
        Carteira e rede
      </h2>
      <RadioGroup
        aria-labelledby={headingId}
        value={provider ?? ''}
        onValueChange={(value) => isWalletProvider(value) && onProviderChange(value)}
      >
        {PROVIDER_OPTIONS.map((option) => {
          const id = `${headingId}-${option.value}`
          return (
            <label
              key={option.value}
              htmlFor={id}
              className="bg-card lg:border-border flex cursor-pointer flex-row-reverse items-center justify-between gap-3 rounded-3xl px-4 py-3 text-sm lg:flex-row lg:justify-start lg:rounded-md lg:border lg:bg-transparent lg:px-3 lg:py-2.5"
            >
              <RadioGroupItem id={id} value={option.value} />
              <span className="flex items-center gap-3">
                <ProviderBadge provider={option.value} />
                {option.label}
              </span>
            </label>
          )
        })}
      </RadioGroup>
      <div className="grid gap-2">
        <Label htmlFor={networkId}>Rede da conexão</Label>
        <Select
          value={network ?? ''}
          onValueChange={(value) => isNetwork(value) && onNetworkChange(value)}
        >
          <SelectTrigger id={networkId}>
            <SelectValue placeholder="Selecione uma rede" />
          </SelectTrigger>
          <SelectContent>
            {NETWORK_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
