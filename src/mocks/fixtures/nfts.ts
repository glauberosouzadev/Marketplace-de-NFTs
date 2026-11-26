import type { Edition, Network, Nft, NftAttribute, NftTag } from '@/contracts'
import { add, parse, toString as decimalToString } from '@/contracts/decimal'
import { COLLECTIONS, NETWORKS } from './collections'

/**
 * 48 NFTs determinísticos (sem Math.random/Date.now). Os 9 primeiros vêm do Figma.
 * `images[0]` = recorte de card (250 px); `images[1]` = detalhe (450 px). As 9 artes se repetem.
 */

interface FigmaNft {
  name: string
  tokenId: string
  price: string
  collection: number
  network: Network
  previousPrice?: string
  badges?: string[]
}

const FIGMA_NFTS: readonly FigmaNft[] = [
  { name: 'Emerald Ape', tokenId: '042', price: '1.19', collection: 0, network: 'ethereum' },
  { name: 'Sage Nomad', tokenId: '009', price: '1.69', collection: 1, network: 'polygon' },
  {
    name: 'Neon Vessel',
    tokenId: '552',
    price: '1.99',
    collection: 3,
    network: 'ethereum',
    previousPrice: '2.29',
    badges: ['RARO'],
  },
  { name: 'Cosmic Bloom', tokenId: '118', price: '1.29', collection: 5, network: 'solana' },
  { name: 'Violet Nomad', tokenId: '314', price: '1.39', collection: 2, network: 'polygon' },
  { name: 'Ivory Baron', tokenId: '088', price: '1.79', collection: 4, network: 'ethereum' },
  { name: 'Golden Beat', tokenId: '207', price: '0.99', collection: 2, network: 'solana' },
  { name: 'Golden Frequency', tokenId: '071', price: '0.59', collection: 6, network: 'polygon' },
  { name: 'Golden Signal', tokenId: '160', price: '0.39', collection: 7, network: 'ethereum' },
]

const TOTAL = 48
const ADJECTIVES = [
  'Cosmic',
  'Amber',
  'Silent',
  'Lunar',
  'Crimson',
  'Misty',
  'Solar',
  'Onyx',
  'Coral',
  'Velvet',
  'Jade',
  'Rustic',
  'Arctic',
]
const NOUNS = ['Ape', 'Nomad', 'Vessel', 'Bloom', 'Baron', 'Beat', 'Frequency', 'Signal', 'Echo']
const TRAITS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['Fundo', ['Creme', 'Verde-sálvia', 'Areia', 'Névoa']],
  ['Acessório', ['Óculos', 'Chapéu', 'Fones', 'Colar']],
  ['Vestimenta', ['Jaqueta', 'Moletom', 'Blazer', 'Camisa']],
]
const BASE_PRICES = [
  '0.15',
  '0.29',
  '0.45',
  '0.69',
  '0.89',
  '1.09',
  '1.45',
  '2.10',
  '3.25',
  '4.80',
  '6.50',
  '8.90',
]
/** Garante no `priceFrom` o mínimo 0,02 e o máximo 12,30 do filtro de preço (PNG). */
const BASE_PRICE_OVERRIDES: Readonly<Record<number, string>> = { 14: '0.02', 20: '12.3' }
const EDITION_LABELS = ['1/10', '1/50', 'ABERTA']
const EDITION_STEPS = ['0', '0.2', '0.5']

const isoDay = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month, day)).toISOString()

function buildEditions(nftId: string, index: number, basePrice: string): Edition[] {
  const base = parse(basePrice)
  const fullySoldOut = index >= FIGMA_NFTS.length && index % 7 === 3
  return EDITION_LABELS.map((label, e) => {
    const raw = (index * 5 + e * 3) % 9
    const available = fullySoldOut
      ? 0
      : index < FIGMA_NFTS.length
        ? raw || 3
        : e === 2
          ? 20 + (index % 30)
          : raw
    return {
      id: `${nftId}-ed-${e + 1}`,
      nftId,
      label,
      price: decimalToString(add(base, parse(EDITION_STEPS[e] ?? '0'))),
      available,
      soldOut: available === 0,
    }
  })
}

function buildAttributes(index: number): NftAttribute[] {
  return TRAITS.map(([traitType, values]) => ({
    traitType,
    value: values[(index + traitType.length) % values.length] ?? '',
  }))
}

function buildNft(index: number): Nft {
  const figma = FIGMA_NFTS[index]
  const id = `nft-${String(index + 1).padStart(3, '0')}`
  const name =
    figma?.name ?? `${ADJECTIVES[index % ADJECTIVES.length]} ${NOUNS[(index * 4) % NOUNS.length]}`
  const tokenId = figma?.tokenId ?? String((index * 37 + 11) % 1000).padStart(3, '0')
  const portrait = String((index % 9) + 1).padStart(2, '0')
  const generatedNetwork = NETWORKS[index % NETWORKS.length] ?? 'ethereum'
  const generatedCollection = (index * 2 + 1) % COLLECTIONS.length
  const collection = COLLECTIONS[figma?.collection ?? generatedCollection]
  if (!collection) throw new Error(`Coleção inexistente para o NFT ${id}`)
  // "Utilidade" nunca existe em Solana: combinação vazia derivável (FR-62).
  const network: Network =
    figma?.network ??
    (collection.id === 'utilidade' && generatedNetwork === 'solana' ? 'ethereum' : generatedNetwork)
  const basePrice =
    figma?.price ??
    BASE_PRICE_OVERRIDES[index] ??
    BASE_PRICES[(index * 7) % BASE_PRICES.length] ??
    '1'
  const previousPrice = figma
    ? figma.previousPrice
    : index % 8 === 5
      ? decimalToString(add(parse(basePrice), parse('0.3')))
      : undefined
  const tags: NftTag[] = []
  if (index % 4 === 0) tags.push('new')
  if (index % 5 === 0) tags.push('trending')
  const badges = figma?.badges ?? (index % 9 === 4 ? ['RARO'] : [])
  const listedAt = figma ? isoDay(2026, 5, 30 - index) : isoDay(2026, 0, 1 + index)
  const nft: Nft = {
    id,
    name: `${name} #${tokenId}`,
    description: `${name} é uma peça da coleção ${collection.name} na rede ${network}. Edição limitada, assinada pelo criador.`,
    collection: { id: collection.id, name: collection.name },
    network,
    tokenId,
    images: [
      {
        url: `/nfts/portrait-${portrait}-card.webp`,
        alt: `${name} #${tokenId}, retrato ilustrado`,
      },
      {
        url: `/nfts/portrait-${portrait}-detail.webp`,
        alt: `${name} #${tokenId}, retrato ilustrado em detalhe`,
      },
    ],
    attributes: buildAttributes(index),
    rating: { score: 3.5 + ((index * 3) % 16) / 10, count: 5 + ((index * 17) % 200) },
    badges,
    tags,
    listedAt,
    priceFrom: basePrice,
    editions: buildEditions(id, index, basePrice),
    version: 1,
  }
  if (previousPrice !== undefined) nft.previousPrice = previousPrice
  return nft
}

export function buildNfts(): Nft[] {
  return Array.from({ length: TOTAL }, (_, index) => buildNft(index))
}
