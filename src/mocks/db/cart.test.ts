import { beforeEach, describe, expect, it } from 'vitest'
import { getOrCreateCart, setCartLine, toCartItem } from './cart'
import { getDb, mutateDb, resetDb } from './store'

beforeEach(() => {
  resetDb()
})

describe('carrinho do mock', () => {
  it('a leitura reflete preço e disponibilidade atuais da edição', () => {
    const nft = getDb().nfts[0]!
    const edition = nft.editions[0]!
    setCartLine('guest:g1', toCartItem(nft, edition, 1))
    mutateDb((db) => {
      const current = db.nfts[0]!.editions[0]!
      current.price = '9.99'
      current.available = 0
    })
    expect(getOrCreateCart('guest:g1').items[0]).toMatchObject({
      unitPrice: '9.99',
      available: 0,
      quantity: 1,
    })
  })
})
