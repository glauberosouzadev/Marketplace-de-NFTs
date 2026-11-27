import { expect, test, type Locator, type Page } from '@playwright/test'
import { gotoApp } from './support'

const NFT_URL = '/nft/nft-001'
const cardLinks = (page: Page) =>
  page.getByRole('region', { name: 'Catálogo de NFTs' }).getByRole('link')

// Retry do Query (1 s + 2 s) até o erro aparecer; o relógio real basta, sem esperas fixas.
test.setTimeout(60_000)

async function box(locator: Locator) {
  const b = await locator.boundingBox()
  if (!b) throw new Error('elemento sem caixa')
  return b
}

test.describe('E2E-12 skeleton, falha e nova tentativa', () => {
  test('S-02: skeleton do catálogo aparece na carga lenta e é trocado pelos cards sem salto de grade', async ({
    page,
  }) => {
    await gotoApp(page, '/', { scenario: 'S-02' })

    const skeleton = page.getByRole('list', { name: 'Carregando NFTs' })
    await expect(skeleton).toBeVisible()
    const before = await box(skeleton.getByRole('listitem').first())

    const grid = page
      .getByRole('region', { name: 'Catálogo de NFTs' })
      .getByRole('list')
      .filter({ has: page.getByRole('link') })
    await expect(skeleton).toHaveCount(0)
    await expect(grid.getByRole('listitem').first()).toBeVisible()
    const after = await box(grid.getByRole('listitem').first())

    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1)
  })

  test('S-03: catálogo mostra erro e "Tentar novamente" recupera a lista', async ({ page }) => {
    await gotoApp(page, '/', { scenario: 'S-03' })

    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs' })
    await expect(alert).toBeVisible({ timeout: 20_000 })
    await expect(cardLinks(page)).toHaveCount(0)

    await alert.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(alert).toHaveCount(0, { timeout: 20_000 })
    await expect(cardLinks(page).first()).toBeVisible()
  })

  test('detalhe: skeleton na carga lenta (S-02) e depois o conteúdo', async ({ page }) => {
    await gotoApp(page, NFT_URL, { scenario: 'S-02' })

    const skeleton = page.getByRole('status', { name: 'Carregando NFT' })
    await expect(skeleton).toBeVisible()
    const before = await box(skeleton.locator('[data-slot="skeleton"]').first())

    const heading = page.getByRole('heading', { level: 1, name: 'Emerald Ape' })
    await expect(heading).toBeVisible()
    await expect(skeleton).toHaveCount(0)
    const image = await box(page.locator('main img').first())
    expect(Math.abs(image.x - before.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(image.width - before.width)).toBeLessThanOrEqual(1)
  })

  test('detalhe S-03: erro com "Tentar novamente" e recuperação após as falhas do cenário', async ({
    page,
  }) => {
    await gotoApp(page, NFT_URL, { scenario: 'S-03' })

    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o NFT' })
    await expect(alert).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape' })).toHaveCount(0)

    await alert.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(alert).toHaveCount(0)
  })

  test('prefers-reduced-motion: skeleton não anima; sem a preferência, anima', async ({ page }) => {
    const animationName = () =>
      page
        .locator('[data-slot="skeleton"]')
        .first()
        .evaluate((el) => getComputedStyle(el).animationName)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await gotoApp(page, '/', { scenario: 'S-02' })
    await expect(page.getByRole('list', { name: 'Carregando NFTs' })).toBeVisible()
    expect(await animationName()).toBe('shimmer')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(animationName).toBe('none')
  })
})
