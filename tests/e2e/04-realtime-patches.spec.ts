import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'
import './support/mock-control'

const NFT = '/nft/nft-001' // Emerald Ape, edição 1/10: 1.19 ETH

const summary = (page: Page) => page.getByRole('region', { name: 'Resumo do pedido' })
const total = (page: Page) =>
  summary(page)
    .locator('dt', { hasText: /^Subtotal$/ })
    .locator('xpath=following-sibling::dd[1]')

async function addAndOpenCart(page: Page): Promise<{ nftId: string; editionId: string }> {
  await gotoApp(page, NFT)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
  await gotoApp(page, '/carrinho')
  await expect(total(page)).toHaveText('1.19 ETH')
  await expect.poll(() => page.evaluate(() => window.__kurioRealtime?.status())).toBe('connected')
  return page.evaluate(() => {
    const item = window.__kurioMock!.listCarts().flatMap((c) => c.items)[0]!
    return { nftId: item.nftId, editionId: item.editionId }
  })
}

test.describe('@main E2E-04 patches e avisos por evento', () => {
  test('updateNft de item do carrinho: aviso anterior → novo anunciado e cotação refeita; replay e stale não repetem', async ({
    page,
  }) => {
    const item = await addAndOpenCart(page)
    await page.evaluate((i) => window.__kurioMock!.updateNft({ ...i, price: '1.5' }), item)

    const notice = page
      .getByRole('status')
      .getByText(/^Preço de Emerald Ape.* mudou: 1\.19 → 1\.5 ETH\.$/)
    await expect(notice).toBeVisible()
    await expect(total(page)).toHaveText('1.5 ETH')
    await expect(page.getByRole('listitem').getByText('1.5 ETH')).toBeVisible()

    await page.getByRole('status').getByRole('button', { name: 'Dispensar aviso' }).first().click()
    await expect(notice).toHaveCount(0)
    await page.evaluate((i) => {
      window.__kurioMock!.replayLastEvent()
      window.__kurioMock!.emitStale({ type: 'nft', id: i.nftId })
    }, item)
    await page.waitForTimeout(300)
    await expect(page.getByText(/mudou:/)).toHaveCount(0)
    await expect(total(page)).toHaveText('1.5 ETH')
  })

  test('soldOut de item do carrinho: aviso assertivo "esgotou" e item marcado', async ({
    page,
  }) => {
    const item = await addAndOpenCart(page)
    await page.evaluate((i) => window.__kurioMock!.soldOut(i.nftId, i.editionId), item)

    await expect(page.getByRole('alert').getByText(/^Emerald Ape.* esgotou\.$/)).toBeVisible()
    await expect(page.getByText(/^Limite atingido: máximo de 0/)).toBeVisible()
  })

  test('detalhe aberto atualiza o preço sem refresh', async ({ page }) => {
    const item = await addAndOpenCart(page)
    await gotoApp(page, NFT)
    await expect(page.getByText('1.19 ETH').first()).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.__kurioRealtime?.status())).toBe('connected')
    await page.evaluate((i) => window.__kurioMock!.updateNft({ ...i, price: '1.7' }), item)
    await expect(page.getByText('1.7 ETH').first()).toBeVisible()
  })
})
