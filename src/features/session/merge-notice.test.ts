import { describe, expect, it } from 'vitest'
import { mergeNoticeText } from './merge-notice'

describe('mergeNoticeText', () => {
  it('sem ajustes retorna null', () => {
    expect(mergeNoticeText([])).toBeNull()
  })

  it('descreve cada ajuste por reason, com o nome quando conhecido', () => {
    const text = mergeNoticeText(
      [
        { nftId: 'n1', editionId: 'e1', reason: 'SOLD_OUT' },
        {
          nftId: 'n2',
          editionId: 'e1',
          reason: 'QUANTITY_REDUCED',
          previousQuantity: 5,
          currentQuantity: 2,
        },
        { nftId: 'n3', editionId: 'e1', reason: 'REMOVED' },
      ],
      (id) => (id === 'n2' ? 'Aurora' : undefined),
    )
    expect(text).toBe(
      'Juntamos seu carrinho ao da sua conta. Um item esgotou e saiu do seu carrinho. ' +
        'A quantidade de "Aurora" foi reduzida de 5 para 2 conforme a disponibilidade. ' +
        'Um item não está mais disponível e foi removido do seu carrinho.',
    )
  })

  it('redução sem quantidades usa texto genérico', () => {
    expect(
      mergeNoticeText([{ nftId: 'n1', editionId: 'e1', reason: 'QUANTITY_REDUCED' }]),
    ).toContain('A quantidade de um item foi reduzida conforme a disponibilidade.')
  })
})
