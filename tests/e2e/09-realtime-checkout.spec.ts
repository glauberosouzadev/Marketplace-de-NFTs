import { expect, test, type Page } from '@playwright/test'
import {
  dismissNotices,
  firstCartItem as cartItem,
  listOrders as orders,
  readyToConfirm,
  type CartItemRef,
} from './support/checkout'

const NEW_PRICE = '9.5'
const STALE = 'Os valores mudaram. Revise e confirme novamente.'
const PENDING = 'Aguardando confirmação do pagamento…'

const confirm = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const accept = (page: Page) => page.getByRole('button', { name: 'Aceitar novos valores' })
const staleAlert = (page: Page) => page.getByRole('alert').filter({ hasText: STALE })
const changes = (page: Page) => page.getByRole('list', { name: 'Valores alterados' })
const summaryTotal = (page: Page) =>
  page.getByRole('region', { name: 'Seus NFTs' }).locator('dt:text-is("Total") + dd')
/** Cada aviso polite é um texto dentro da região `status` compartilhada. */
const priceNotices = (page: Page, name: string) =>
  page.getByRole('status').getByText(`Preço de ${name} mudou:`)
const ref = ({ nftId, editionId }: CartItemRef) => ({ nftId, editionId })

const ethAmount = (text: string | null): string => (text ?? '').replace(/ ETH$/, '').trim()

test.describe('@main E2E-09 preço e disponibilidade em tempo real durante o checkout', () => {
  test('(1)(3) preço muda na revisão: aviso anterior → novo, bloqueio e pedido com o total novo', async ({
    page,
  }) => {
    await readyToConfirm(page)
    const item = await cartItem(page)
    await expect(summaryTotal(page)).toHaveText(/^\d+(\.\d+)? ETH$/)
    const oldTotal = ethAmount(await summaryTotal(page).textContent())

    await page.evaluate((i) => window.__kurioMock?.updateNft(i), {
      ...ref(item),
      price: NEW_PRICE,
    })

    await expect(priceNotices(page, item.name)).toHaveText(
      `Preço de ${item.name} mudou: ${item.unitPrice} → ${NEW_PRICE} ETH.`,
    )
    await expect(staleAlert(page)).toBeVisible()
    const priceChange = changes(page)
      .getByRole('listitem')
      .filter({ hasText: `Preço de ${item.name}` })
    await expect(priceChange).toContainText(`${item.unitPrice} ETH`)
    await expect(priceChange).toContainText(`${NEW_PRICE} ETH`)
    const totalChange = changes(page)
      .getByRole('listitem')
      .filter({ hasText: /^Total/ })
    await expect(totalChange).toContainText(`${oldTotal} ETH`)
    await expect(confirm(page)).toBeDisabled()
    await expect(confirm(page)).toHaveAccessibleDescription(STALE)
    expect(await orders(page)).toHaveLength(0)

    await dismissNotices(page)
    await accept(page).click()
    await expect(staleAlert(page)).toHaveCount(0)
    await expect(confirm(page)).toBeEnabled()
    await expect(summaryTotal(page)).not.toHaveText(`${oldTotal} ETH`)
    const newTotal = ethAmount(await summaryTotal(page).textContent())
    expect(await orders(page)).toHaveLength(0)

    await confirm(page).click()

    await expect(page.getByRole('status').filter({ hasText: PENDING })).toBeVisible()
    const all = await orders(page)
    expect(all).toHaveLength(1)
    expect(all[0]?.snapshot.total).toBe(newTotal)
    expect(all[0]?.snapshot.total).not.toBe(oldTotal)
    expect(all[0]?.snapshot.lines[0]?.unitPrice).toBe(NEW_PRICE)
  })

  test('(2)(3) soldOut: item marcado, compra bloqueada com texto e nenhum pedido', async ({
    page,
  }) => {
    await readyToConfirm(page)
    const item = await cartItem(page)
    const soldOutIssue = `Esgotado: ${item.name}. Remova o item para continuar.`

    await page.evaluate(
      ({ nftId, editionId }) => window.__kurioMock?.soldOut(nftId, editionId),
      item,
    )

    await expect(
      page.getByRole('alert').getByText(`${item.name}`).filter({ hasText: 'esgotou.' }),
    ).toBeVisible()
    await expect(staleAlert(page)).toBeVisible()
    await expect(
      changes(page)
        .getByRole('listitem')
        .filter({ hasText: `Disponibilidade de ${item.name}` }),
    ).toContainText('Esgotado')
    await expect(confirm(page)).toBeDisabled()
    await expect(confirm(page)).toHaveAccessibleDescription(STALE)
    // FR-55: a própria linha do item na revisão fica marcada como esgotada.
    const line = page
      .getByRole('list', { name: 'Itens do pedido' })
      .getByRole('listitem')
      .filter({ hasText: item.name })
    await expect(line).toContainText(/Esgotad[oa]/)
    expect(await orders(page)).toHaveLength(0)

    // Aceitar os novos valores não libera: o item esgotado segue bloqueando, com texto.
    await dismissNotices(page)
    await accept(page).click()
    await expect(staleAlert(page)).toHaveCount(0)
    const issues = page.getByRole('list', { name: 'Avisos do resumo' })
    await expect(issues).toContainText(soldOutIssue)
    await expect(confirm(page)).toBeDisabled()
    await expect(confirm(page)).toHaveAccessibleDescription(soldOutIssue)
    expect(await orders(page)).toHaveLength(0)
  })

  test('(1)(3) evento duplicado ou antigo não gera novo aviso (dedupe do reconciliador: unitário)', async ({
    page,
  }) => {
    await readyToConfirm(page)
    const item = await cartItem(page)

    // Duplicata imediata: chega pelo socket antes do refetch do carrinho.
    await page.evaluate(
      (i) => {
        window.__kurioMock?.updateNft(i)
        window.__kurioMock?.replayLastEvent()
      },
      { ...ref(item), price: NEW_PRICE },
    )

    const allNotices = page.getByRole('button', { name: 'Dispensar aviso' })
    await expect(staleAlert(page)).toBeVisible()
    await expect(allNotices).toHaveCount(1)
    await expect(priceNotices(page, item.name)).toHaveCount(1)
    await dismissNotices(page)
    await accept(page).click()

    // Estado de referência antes do replay: sem avisos, sem diff, CTA liberado.
    await expect(confirm(page)).toBeEnabled()
    await expect(staleAlert(page)).toHaveCount(0)
    await expect(allNotices).toHaveCount(0)

    await page.evaluate((id) => {
      window.__kurioMock?.replayLastEvent()
      window.__kurioMock?.emitStale({ type: 'nft', id })
    }, item.nftId)
    // Ponto de sincronia: o socket entrega em ordem; o evento novo aparece sozinho.
    await page.evaluate((i) => window.__kurioMock?.updateNft({ ...i, price: '11' }), ref(item))
    await expect(priceNotices(page, item.name)).toHaveText([
      `Preço de ${item.name} mudou: ${NEW_PRICE} → 11 ETH.`,
    ])
    await expect(allNotices).toHaveCount(1)
    await expect(staleAlert(page)).toHaveCount(1)
    // O diff parte do preço aceito na revisão, não de um estado reaplicado pelo replay.
    const priceChange = changes(page)
      .getByRole('listitem')
      .filter({ hasText: `Preço de ${item.name}` })
    await expect(priceChange).toHaveCount(1)
    await expect(priceChange).toContainText(`${NEW_PRICE} ETH`)
    await expect(priceChange).toContainText('11 ETH')
    expect(await orders(page)).toHaveLength(0)
  })
})
