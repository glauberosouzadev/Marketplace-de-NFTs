import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'

const NFT_A = '/nft/nft-001'
const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const EMPTY_TEXT = 'Seu carrinho está vazio. Adicione um NFT para ir ao pagamento.'

async function fillLogin(page: Page): Promise<void> {
  await page.getByPlaceholder('contato@email.com').fill(ANA.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(ANA.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function addToCart(page: Page): Promise<void> {
  await gotoApp(page, NFT_A)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
}

test.describe('@main rota /pagamento (guard e navegação)', () => {
  test('visitante em /pagamento vai ao login com redirect e volta após entrar', async ({
    page,
  }) => {
    await addToCart(page)
    await gotoApp(page, '/pagamento')

    await expect(page).toHaveURL(/\/login\?.*redirect=%2Fpagamento|\/login\?.*redirect=\/pagamento/)
    await fillLogin(page)

    await expect(page).toHaveURL(/\/pagamento/)
    await expect(page.getByRole('heading', { level: 1, name: 'Pagamento' })).toBeAttached()
  })

  test('carrinho vazio redireciona a /carrinho com aviso acessível', async ({ page }) => {
    await gotoApp(page, '/login')
    await fillLogin(page)
    await expect(page).not.toHaveURL(/\/login/)

    await gotoApp(page, '/pagamento')

    await expect(page).toHaveURL(/\/carrinho/)
    await expect(page.getByText(EMPTY_TEXT)).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Carrinho de NFTs' })).toBeVisible()
  })

  test('com sessão e itens, o CTA do carrinho navega para /pagamento', async ({ page }) => {
    await gotoApp(page, '/login')
    await fillLogin(page)
    await expect(page).not.toHaveURL(/\/login/)
    await addToCart(page)
    await gotoApp(page, '/carrinho')

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()

    await expect(page).toHaveURL(/\/pagamento/)
    await expect(page).not.toHaveURL(/\/carrinho/)
  })
})
