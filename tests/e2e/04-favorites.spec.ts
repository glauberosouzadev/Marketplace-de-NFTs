import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const BRUNO = { email: 'bruno@kurio.test', password: 'Colecao#2026' }

const heart = (page: Page) => page.getByRole('button', { name: /^(Favoritar|Remover) .+/ }).first()
const failureNotice = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Não foi possível adicionar' })

async function login(page: Page, user = ANA): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(user.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function openHome(page: Page): Promise<void> {
  await gotoApp(page, '/')
  await expect(heart(page)).toBeVisible()
}

/** Favorita o primeiro card do catálogo e devolve o nome do NFT. */
async function favoriteFirst(page: Page): Promise<string> {
  const button = heart(page)
  const label = (await button.getAttribute('aria-label')) ?? ''
  const name = label.replace(/^Favoritar /, '')
  await button.click()
  await expect(page.getByRole('button', { name: `Remover ${name} dos favoritos` })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // O PUT precisa chegar ao banco do mock antes de qualquer recarga de página.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('kurio-mock:favorites') ?? ''))
    .toContain('nft-')
  return name
}

async function openFavorites(page: Page): Promise<void> {
  await gotoApp(page, '/favoritos')
  await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/')
  await page.evaluate(() => window.__kurioMock?.reset())
})

test.describe('@main @responsive E2E-04 favoritos', () => {
  test('visitante é levado ao login e volta à página', async ({ page }) => {
    await openHome(page)

    await heart(page).click()

    await expect(page).toHaveURL(/\/login\?.*redirect=/)
    await page.getByPlaceholder('contato@email.com').fill(ANA.email)
    await page.getByPlaceholder('Senha', { exact: true }).fill(ANA.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).not.toHaveURL(/\/login/)
    await expect(heart(page)).toBeVisible()
  })

  test('favoritar é otimista, aparece em /favoritos e persiste após refresh', async ({ page }) => {
    await login(page)
    await openHome(page)

    const name = await favoriteFirst(page)

    await openFavorites(page)
    await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible()
    await openHome(page)
    await expect(
      page.getByRole('button', { name: `Remover ${name} dos favoritos` }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('falha da mutation reverte o estado, avisa em role=status e a nova tentativa funciona', async ({
    page,
  }) => {
    await login(page)
    await openHome(page)
    await page.evaluate(() => window.__kurioMock?.setScenario('S-03'))
    const button = heart(page)
    const label = (await button.getAttribute('aria-label')) ?? ''
    const name = label.replace(/^Favoritar /, '')

    await button.click()

    await expect(failureNotice(page)).toBeVisible()
    await expect(page.getByRole('button', { name: `Favoritar ${name}` })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await page.getByRole('button', { name: `Favoritar ${name}` }).click()

    await expect(
      page.getByRole('button', { name: `Remover ${name} dos favoritos` }),
    ).toHaveAttribute('aria-pressed', 'true')
    await openFavorites(page)
    await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible()
  })

  test('desfavoritar em /favoritos remove o card', async ({ page }) => {
    await login(page)
    await openHome(page)
    const name = await favoriteFirst(page)
    await openFavorites(page)
    const remove = page.getByRole('button', { name: `Remover ${name} dos favoritos` })

    await remove.click()

    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()
    await expect(remove).toHaveCount(0)
  })

  test('outro usuário não vê os favoritos do primeiro', async ({ page }) => {
    await login(page)
    await openHome(page)
    await favoriteFirst(page)
    // Sem "Sair" no mobile (FR-43): encerra a sessão local; o banco do mock vive no localStorage.
    await page.evaluate(() => localStorage.removeItem('kurio:session'))
    await login(page, BRUNO)

    await openFavorites(page)

    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()
  })

  test('estado vazio e erro do GET com nova tentativa', async ({ page }) => {
    await login(page)
    // O MSW atende no navegador e `page.route` não vê esses pedidos: o GET de favoritos é
    // desviado para uma porta fechada, o que produz uma falha de rede real.
    await page.addInitScript(() => {
      const open = XMLHttpRequest.prototype.open
      XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: unknown[]
      ) {
        const down = sessionStorage.getItem('favoritesDown') === '1'
        const target =
          down && method === 'GET' && /\/me\/favorites$/.test(String(url))
            ? 'http://127.0.0.1:1/me/favorites'
            : url
        return (open as (...a: unknown[]) => void).call(this, method, target, ...rest)
      } as typeof open
    })
    await page.evaluate(() => sessionStorage.setItem('favoritesDown', '1'))
    await openFavorites(page)

    await expect(
      page.getByRole('heading', { name: 'Não foi possível carregar seus favoritos' }),
    ).toBeVisible()
    await page.evaluate(() => sessionStorage.removeItem('favoritesDown'))
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()
  })
})
