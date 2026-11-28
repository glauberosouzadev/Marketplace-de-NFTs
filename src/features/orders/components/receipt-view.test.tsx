import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Order, OrderStatus } from '@/contracts'
import { ExplorerLink } from './explorer-link'
import { OrderBlock } from './receipt-view'

const nftState = vi.hoisted(() => ({ failed: false }))

vi.mock('@/features/nft-detail/queries', () => ({
  useNft: () =>
    nftState.failed
      ? { data: undefined, isPending: false }
      : {
          isPending: false,
          data: {
            name: 'Emerald Ape #042',
            tokenId: '0042',
            images: [{ url: '/nfts/a.webp', alt: 'Emerald Ape' }],
          },
        },
}))

const order = (status: OrderStatus, overrides: Partial<Order['snapshot']> = {}): Order => ({
  id: 'o1',
  userId: 'u1',
  status,
  version: 1,
  idempotencyKey: 'k',
  requestFingerprint: 'f',
  snapshot: {
    lines: [
      {
        nftId: 'n1',
        editionId: 'e1',
        unitPrice: '1.19',
        quantity: 2,
        lineTotal: '2.38',
        available: 3,
      },
    ],
    subtotal: '2.38',
    discount: '0',
    networkFee: '0.016',
    total: '2.396',
    network: 'polygon',
    wallet: { label: 'Principal', address: '0xabc', provider: 'metamask' },
    collector: { displayName: 'A', profileName: 'a', email: 'a@a.com' },
    ...overrides,
  },
  txHash: `0xA91F${'0'.repeat(54)}E82C`,
  explorerUrl: 'https://explorer.kurio.invalid/polygon/tx/0x1',
  createdAt: '2026-07-29T12:00:00.000Z',
  settledAt: '2026-07-29T12:00:00.000Z',
})

const render = (o: Order): string => renderToStaticMarkup(<OrderBlock order={o} />)

describe('OrderBlock', () => {
  it('confirmado mostra o recibo do snapshot, com rede e explorador do pedido', () => {
    const html = render(order('confirmed'))
    expect(html).toContain('Seus NFTs agora estão na sua carteira')
    expect(html).toContain('0xA91F…E82C')
    expect(html).toContain('MetaMask')
    expect(html).toContain('Emerald Ape #042')
    expect(html).toContain('ID do token: #0042')
    expect(html).toContain('2.38 ETH')
    expect(html).toContain('Transação confirmada na Polygon.')
    expect(html).toContain('Ver no Polygonscan')
    expect(html).toContain('Link simulado')
  })

  it('catálogo indisponível: fallback sem skeleton, mantendo os valores do snapshot', () => {
    nftState.failed = true
    const html = render(order('confirmed'))
    nftState.failed = false
    expect(html).toContain('NFT n1')
    expect(html).toContain('2.38 ETH')
    expect(html).not.toContain('ID do token')
    expect(html).not.toContain('animate-shimmer')
  })

  it('link do explorador só com https', () => {
    const html = renderToStaticMarkup(<ExplorerLink network="solana" url="javascript:alert(1)" />)
    expect(html).not.toContain('href')
    expect(html).toContain('Solscan')
  })

  it('"Desconto" só aparece quando maior que 0', () => {
    expect(render(order('confirmed'))).not.toContain('Desconto')
    expect(render(order('confirmed', { discount: '0.1' }))).toContain('(-) 0.1 ETH')
  })

  it.each([
    ['pending', 'Pedido aguardando confirmação'],
    ['rejected', 'Pedido recusado'],
  ] as const)('%s mostra o estado real, nunca o recibo', (status, title) => {
    const html = render(order(status))
    expect(html).toContain(title)
    expect(html).not.toContain('Seus NFTs agora estão')
    expect(html).not.toContain('Transação confirmada')
    expect(html).not.toContain('Ver no')
  })
})
