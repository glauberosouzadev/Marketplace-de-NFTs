import type { Network } from '@/contracts'
import { Button } from '@/ui/button'
import { explorerName } from '../presentation'

interface ExplorerLinkProps {
  network: Network
  url: string
}

const isHttps = (url: string): boolean => URL.canParse(url) && new URL(url).protocol === 'https:'

/** Q-22: destino fictício, marcado como simulado para não sugerir uma transação real. */
export function ExplorerLink({ network, url }: ExplorerLinkProps) {
  if (!isHttps(url))
    return (
      <p className="text-muted-foreground text-xs">
        Explorador {explorerName(network)} indisponível.
      </p>
    )
  return (
    <div className="flex flex-col items-center gap-2">
      <Button asChild className="px-8 lg:h-12 lg:rounded-none">
        <a href={url} target="_blank" rel="noopener noreferrer">
          Ver no {explorerName(network)}
          <span className="sr-only"> (link simulado, abre em nova aba)</span>
        </a>
      </Button>
      <p className="text-muted-foreground text-xs">
        Link simulado: não corresponde a uma transação real.
      </p>
    </div>
  )
}
