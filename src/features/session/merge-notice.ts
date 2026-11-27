import type { CartAdjustment } from '@/contracts'

export type NftNameResolver = (nftId: string) => string | undefined

function describeAdjustment(adjustment: CartAdjustment, nameOf: NftNameResolver): string {
  const name = nameOf(adjustment.nftId)
  const item = name ? `"${name}"` : 'Um item'
  switch (adjustment.reason) {
    case 'SOLD_OUT':
      return `${item} esgotou e saiu do seu carrinho.`
    case 'REMOVED':
      return `${item} não está mais disponível e foi removido do seu carrinho.`
    case 'QUANTITY_REDUCED': {
      const target = name ? `"${name}"` : 'um item'
      const { previousQuantity: from, currentQuantity: to } = adjustment
      return from !== undefined && to !== undefined
        ? `A quantidade de ${target} foi reduzida de ${from} para ${to} conforme a disponibilidade.`
        : `A quantidade de ${target} foi reduzida conforme a disponibilidade.`
    }
  }
}

/** Texto único (pt-BR) do merge de carrinhos; `null` quando não houve ajuste. */
export function mergeNoticeText(
  adjustments: readonly CartAdjustment[],
  nameOf: NftNameResolver = () => undefined,
): string | null {
  if (adjustments.length === 0) return null
  const details = adjustments.map((a) => describeAdjustment(a, nameOf)).join(' ')
  return `Juntamos seu carrinho ao da sua conta. ${details}`
}
