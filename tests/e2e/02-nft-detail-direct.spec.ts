import { expect, test } from '@playwright/test'
import { gotoApp } from './support'

const NFT_ID = 'nft-001'
const NFT_URL = `/nft/${NFT_ID}`

test.describe('@main E2E-02 detalhe por acesso direto', () => {
  test('deep link e reload mostram nome, preço, coleção e atributos', async ({ page }) => {
    await gotoApp(page, NFT_URL)

    const purchase = page.getByRole('region', { name: 'Compra' })
    const heading = page.getByRole('heading', { level: 1, name: 'Emerald Ape' })
    await expect(heading).toBeVisible()
    await expect(purchase.getByText('1.19 ETH')).toBeVisible()
    await expect(page.getByText('Coleção:')).toBeVisible()
    await expect(page.getByText('Atributos:')).toBeVisible()
    const tokenId = page.getByRole('definition').filter({ hasText: '#042' })
    await expect(tokenId).toBeVisible()

    await page.reload()

    await expect(page).toHaveURL(new RegExp(`${NFT_URL}`))
    await expect(heading).toBeVisible()
    await expect(purchase.getByText('1.19 ETH')).toBeVisible()
    await expect(page.getByRole('term').filter({ hasText: 'Coleção:' })).toBeVisible()
    await expect(tokenId).toBeVisible()
  })

  test('id inexistente mostra "NFT não encontrado" e o link leva ao Início', async ({ page }) => {
    await gotoApp(page, '/nft/inexistente')

    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao Início' }).click()

    await expect(page).toHaveURL(/\/(\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toHaveCount(0)
  })

  test('edição esgotada aparece com "Esgotada" e desabilitada', async ({ page }) => {
    await gotoApp(page, '/')
    await expect.poll(() => page.evaluate(() => Boolean(window.__kurioMock))).toBe(true)
    await page.evaluate(() => window.__kurioMock?.soldOut('nft-001', 'nft-001-ed-2'))

    await gotoApp(page, NFT_URL)

    const soldOut = page.getByRole('radio', { name: /1\/50.*Esgotada/ })
    await expect(soldOut).toBeDisabled()
    await expect(page.getByText('· Esgotada')).toBeVisible()
    await expect(page.getByRole('radio', { name: /^1\/10/ })).toBeEnabled()
  })

  test('"+" desabilita no limite e mostra a mensagem do limite', async ({ page }) => {
    await gotoApp(page, NFT_URL)
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
    const qty = page.getByLabel('Qtd.')
    await expect(qty).toHaveValue('1')
    await expect(plus).not.toHaveAttribute('aria-disabled', 'true')

    await plus.click()
    await plus.click()

    await expect(qty).toHaveValue('3')
    await expect(plus).toHaveAttribute('aria-disabled', 'true')
    await expect(
      page.getByText('Limite atingido: máximo de 3 unidades nesta edição.'),
    ).toBeVisible()

    await plus.click({ force: true })
    await expect(qty).toHaveValue('3')
  })
})
