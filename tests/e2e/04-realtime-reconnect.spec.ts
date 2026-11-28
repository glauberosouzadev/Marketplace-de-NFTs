import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'
import './support/mock-control'

const NFT = '/nft/nft-001' // Emerald Ape, edição 1/10: 1.19 ETH

const status = (page: Page) => page.evaluate(() => window.__kurioRealtime?.status())
const connected = (page: Page) => expect.poll(() => status(page)).toBe('connected')
const subtotal = (page: Page) =>
  page
    .getByRole('region', { name: 'Resumo do pedido' })
    .locator('dt', { hasText: /^Subtotal$/ })
    .locator('xpath=following-sibling::dd[1]')

async function addToCart(page: Page) {
  await gotoApp(page, NFT)
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
}

const firstItem = (page: Page) =>
  page.evaluate(() => {
    const item = window.__kurioMock!.listCarts().flatMap((c) => c.items)[0]!
    return { nftId: item.nftId, editionId: item.editionId }
  })

test.describe('@main E2E-04 reconexão', () => {
  test('queda anuncia "Reconectando…"; reconexão mostra "Reconectado" que some', async ({
    page,
  }) => {
    await gotoApp(page, NFT)
    await connected(page)
    await expect(page.getByText('Reconectado')).toHaveCount(0)

    await page.evaluate(() => window.__kurioMock!.dropRealtime())
    await expect(page.getByRole('status').getByText('Reconectando…')).toBeVisible()

    await page.evaluate(() => window.__kurioMock!.restoreRealtime())
    await expect(page.getByRole('status').getByText('Reconectado')).toBeVisible()
    await expect(page.getByText('Reconectando…')).toHaveCount(0)
    await expect(page.getByText('Reconectado')).toHaveCount(0, { timeout: 8000 })
  })

  test('primeira carga não exibe "Reconectado"', async ({ page }) => {
    await gotoApp(page, NFT)
    await connected(page)
    await page.waitForTimeout(500)
    await expect(page.getByText(/Reconectado|Reconectando/)).toHaveCount(0)
  })

  test('preço mudado durante a queda aparece no carrinho/cotação após reconectar', async ({
    page,
  }) => {
    await addToCart(page)
    const item = await firstItem(page)
    await gotoApp(page, '/carrinho')
    await expect(subtotal(page)).toHaveText('1.19 ETH')
    await connected(page)

    await page.evaluate(() => window.__kurioMock!.dropRealtime())
    await expect(page.getByText('Reconectando…')).toBeVisible()
    await page.evaluate((i) => window.__kurioMock!.updateNft({ ...i, price: '1.5' }), item)
    await expect(subtotal(page)).toHaveText('1.19 ETH')

    await page.evaluate(() => window.__kurioMock!.restoreRealtime())
    await expect(page.getByText('Reconectado')).toBeVisible()
    await expect(subtotal(page)).toHaveText('1.5 ETH')
  })

  test('detalhe aberto é reconsultado após reconectar', async ({ page }) => {
    await addToCart(page)
    const item = await firstItem(page)
    await gotoApp(page, NFT)
    await expect(page.getByText('1.19 ETH').first()).toBeVisible()
    await connected(page)

    await page.evaluate(() => window.__kurioMock!.dropRealtime())
    await expect(page.getByText('Reconectando…')).toBeVisible()
    await page.evaluate((i) => window.__kurioMock!.updateNft({ ...i, price: '1.7' }), item)
    await page.evaluate(() => window.__kurioMock!.restoreRealtime())
    await expect(page.getByText('1.7 ETH').first()).toBeVisible()
  })
})
