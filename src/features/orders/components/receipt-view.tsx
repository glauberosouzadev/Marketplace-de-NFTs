import { LoaderCircle } from 'lucide-react'
import type { Order, OrderSnapshot, QuoteLine } from '@/contracts'
import { useNft } from '@/features/nft-detail/queries'
import { isApiError } from '@/http/normalize-error'
import { Button } from '@/ui/button'
import { Skeleton } from '@/ui/skeleton'
import { useOrder } from '../queries'
import {
  ORDER_STATE_COPY,
  confirmationText,
  hasDiscount,
  providerLabel,
  receiptDate,
  transactionId,
} from '../presentation'
import { ExplorerLink } from './explorer-link'
import { OrderNotFound } from './order-not-found'
import { ReceiptSkeleton } from './receipt-skeleton'

const isNotFound = (error: unknown): boolean =>
  isApiError(error) && error.kind === 'http' && error.status === 404

interface ReceiptViewProps {
  uid: string
  orderId: string
}

/** Carrega o pedido e escolhe o bloco: skeleton, 404, erro com nova tentativa ou o pedido. */
export function ReceiptView({ uid, orderId }: ReceiptViewProps) {
  const { data, error, isPending, refetch } = useOrder(uid, orderId)

  if (isPending) return <ReceiptSkeleton />
  if (data) return <OrderBlock order={data} />
  if (isNotFound(error)) return <OrderNotFound />
  return (
    <div role="alert" className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <p className="text-xl font-bold">Não foi possível carregar o pedido</p>
      <p className="text-muted-foreground max-w-md text-sm">
        Houve um problema de conexão ou do servidor. Tente novamente.
      </p>
      <Button type="button" onClick={() => void refetch()} className="px-8">
        Tentar novamente
      </Button>
    </div>
  )
}

/** RN-11: o recibo só existe com `confirmed`; os demais estados mostram o estado real em texto. */
export function OrderBlock({ order }: { order: Order }) {
  if (order.status === 'confirmed') return <Receipt order={order} />
  const copy = ORDER_STATE_COPY[order.status]
  return (
    <div role="status" className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      {order.status === 'pending' && (
        <LoaderCircle
          aria-hidden
          className="text-price size-8 animate-spin motion-reduce:animate-none"
        />
      )}
      <p className="text-xl font-bold">{copy.title}</p>
      <p className="text-muted-foreground max-w-md text-sm">{copy.text}</p>
    </div>
  )
}

const metaCell =
  'flex min-w-0 flex-col gap-0.5 px-4 first:pl-0 last:pr-0 [&:not(:first-child)]:border-l'

function Receipt({ order }: { order: Order }) {
  const { snapshot } = order
  return (
    <div className="flex flex-col">
      <header className="flex flex-col items-center gap-4 px-6 pt-10 pb-6 text-center">
        <img src="/icons/thank-you.png" alt="" className="h-20 w-auto" />
        <p className="text-muted-foreground text-base font-bold">
          Seus NFTs agora estão na sua carteira
        </p>
      </header>
      <dl className="border-primary text-muted-foreground mx-6 grid grid-cols-2 gap-y-3 border-y py-3 text-xs lg:mx-0 lg:grid-cols-4 lg:px-9">
        <MetaCell label="ID da transação" value={transactionId(order)} bold />
        <MetaCell label="Data" value={receiptDate(order)} />
        <MetaCell label="Total" value={`${snapshot.total} ETH`} />
        <MetaCell label="Carteira" value={providerLabel(snapshot.wallet.provider)} bold />
      </dl>
      <section className="flex flex-col gap-3 px-6 pt-6 pb-8 lg:px-11">
        <h2 className="text-sm font-bold">Detalhes da transação</h2>
        <ReceiptItems lines={snapshot.lines} />
        <Totals snapshot={snapshot} />
        <p className="text-muted-foreground text-center text-xs leading-[22px]">
          {confirmationText(snapshot.network)}
        </p>
        {order.explorerUrl && (
          <div className="mt-2 flex justify-center">
            <ExplorerLink network={snapshot.network} url={order.explorerUrl} />
          </div>
        )}
      </section>
    </div>
  )
}

function MetaCell({
  label,
  value,
  bold = false,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className={`${metaCell} border-primary`}>
      <dt className={bold ? 'font-bold' : undefined}>{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  )
}

function ReceiptItems({ lines }: { lines: readonly QuoteLine[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-border border-b text-left text-sm font-bold">
          <th scope="col" className="pb-2 font-bold">
            NFTs
          </th>
          <th scope="col" className="px-2 pb-2 text-center font-bold">
            Edições
          </th>
          <th scope="col" className="pb-2 text-right font-bold">
            Subtotal
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <ReceiptLine key={`${line.nftId}:${line.editionId}`} line={line} />
        ))}
      </tbody>
    </table>
  )
}

function ReceiptLine({ line }: { line: QuoteLine }) {
  const { data: nft, isPending } = useNft(line.nftId)
  const image = nft?.images[0]
  return (
    <tr>
      <td className="w-full max-w-0 py-2">
        <div className="flex items-center gap-3">
          {image ? (
            <img
              src={image.url}
              alt={image.alt}
              loading="lazy"
              className="size-[70px] shrink-0 rounded-sm object-cover"
            />
          ) : isPending ? (
            <Skeleton className="size-[70px] shrink-0 rounded-sm" />
          ) : (
            <div aria-hidden className="bg-secondary size-[70px] shrink-0 rounded-sm" />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate font-bold">{nft?.name ?? `NFT ${line.nftId}`}</p>
            {nft ? (
              <p className="text-muted-foreground truncate text-xs">ID do token: #{nft.tokenId}</p>
            ) : (
              isPending && <Skeleton className="h-4 w-24" />
            )}
          </div>
        </div>
      </td>
      <td className="text-muted-foreground px-2 text-center text-xs whitespace-nowrap">
        <span aria-hidden>(x {line.quantity})</span>
        <span className="sr-only">Quantidade: {line.quantity}</span>
      </td>
      <td className="text-price py-2 text-right font-bold whitespace-nowrap">
        {line.lineTotal} ETH
      </td>
    </tr>
  )
}

function Totals({ snapshot }: { snapshot: OrderSnapshot }) {
  return (
    <dl className="border-border flex flex-col gap-2 border-b pb-3 text-sm">
      {hasDiscount(snapshot) && (
        <TotalRow label="Desconto" value={`(-) ${snapshot.discount} ETH`} />
      )}
      <TotalRow label="Taxa de rede" value={`${snapshot.networkFee} ETH`} />
      <TotalRow label="Total" value={`${snapshot.total} ETH`} strong />
    </dl>
  )
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex justify-end gap-8 sm:gap-16">
      <dt className={strong ? 'font-bold' : undefined}>{label}</dt>
      <dd className={`min-w-28 text-right ${strong ? 'text-price font-bold' : ''}`}>{value}</dd>
    </div>
  )
}
