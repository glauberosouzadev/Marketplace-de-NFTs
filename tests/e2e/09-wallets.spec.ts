import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const ETH_ADDRESS = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f'
const POLYGON_ADDRESS = '0x2a6a3b1f0d9c4e8b7a5f3c1d9e8b7a6c5d4e3f2a'
const SOLANA_ADDRESS = '7Xk9aQ2mPzR4tVb8NcLfH3yJdWe6SgUo1ZiA5nMhKqTp'
const REQUIRED = 'Campo obrigatório'
const INVALID_ADDRESS = 'Endereço inválido para a rede selecionada'

const field = (page: Page, label: string) => page.getByRole('textbox', { name: label, exact: true })
const combo = (page: Page, label: RegExp) => page.getByRole('combobox', { name: label })
const save = (page: Page) => page.getByRole('button', { name: 'Salvar carteira' })

async function login(page: Page, user = ANA): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(user.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function openWallets(page: Page): Promise<void> {
  await gotoApp(page, '/carteiras')
  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  await expect(field(page, 'Nome de exibição')).toBeVisible()
}

async function pick(page: Page, label: RegExp, option: string): Promise<void> {
  await combo(page, label).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function register(page: Page, username: string): Promise<void> {
  await gotoApp(page, '/cadastro')
  await page.getByPlaceholder('Nome de usuário').fill(username)
  await page.getByPlaceholder('Digite seu e-mail').fill(`${username}@kurio.test`)
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@2026')
  await page.getByPlaceholder('Confirmar senha').fill('Kurio@2026')
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page).not.toHaveURL(/\/(login|cadastro)/)
}

async function fillAll(page: Page, address: string): Promise<void> {
  await field(page, 'Nome de exibição').fill('Novo Colecionador')
  await field(page, 'Apelido da carteira').fill('Minha carteira')
  await pick(page, /^Rede/, 'Ethereum')
  await field(page, 'Nome do perfil').fill('novo.colecionador')
  await field(page, 'Endereço da carteira').fill(address)
  await pick(page, /^Tipo de carteira/, 'MetaMask')
  await field(page, 'E-mail').fill('novo@kurio.test')
  await page.getByRole('textbox', { name: /^Nome ENS/ }).fill('novo')
}

test.describe('@main @responsive E2E-09 carteiras: carteira principal', () => {
  test('sem sessão vai a /login?redirect=/carteiras', async ({ page }) => {
    await gotoApp(page, '/carteiras')

    await expect(page).toHaveURL(/\/login\?.*redirect=%2Fcarteiras/)
  })

  test('usuário com carteira vê o formulário pré-preenchido e sem overflow', async ({ page }) => {
    await login(page)
    await openWallets(page)

    await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Colecionadora')
    await expect(field(page, 'Endereço da carteira')).toHaveValue(ETH_ADDRESS)
    await expect(combo(page, /^Rede/)).toContainText('Ethereum')
    await expect(combo(page, /^Tipo de carteira/)).toContainText('MetaMask')
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('"Código de indicação" não tem * nem aria-required; os demais obrigatórios têm', async ({
    page,
  }) => {
    await login(page)
    await openWallets(page)

    const referral = page.getByRole('textbox', { name: 'Código de indicação', exact: true })
    await expect(referral).toBeVisible()
    await expect(referral).not.toHaveAttribute('aria-required', 'true')
    await expect(referral).not.toHaveAttribute('required', /.*/)
    await expect(page.getByText('Código de indicação*')).toHaveCount(0)
    await expect(field(page, 'Apelido da carteira')).toHaveAttribute('aria-required', 'true')
  })

  test('edição persiste após refresh e referral vazio é aceito, com anúncio em região live', async ({
    page,
  }) => {
    await login(page)
    await openWallets(page)

    await field(page, 'Apelido da carteira').fill('Cofre editado')
    await page.getByRole('textbox', { name: 'Código de indicação', exact: true }).fill('')
    await save(page).click()

    await expect(page.getByRole('status').filter({ hasText: 'Carteira salva.' })).toBeVisible()
    await page.reload()
    await expect(field(page, 'Apelido da carteira')).toHaveValue('Cofre editado')
    await expect(
      page.getByRole('textbox', { name: 'Código de indicação', exact: true }),
    ).toHaveValue('')
  })

  test('obrigatórios vazios mostram erro nos campos e focam o primeiro inválido', async ({
    page,
  }) => {
    await login(page)
    await openWallets(page)

    await field(page, 'Nome de exibição').fill('')
    await field(page, 'E-mail').fill('')
    await save(page).click()

    await expect(field(page, 'Nome de exibição')).toBeFocused()
    await expect(field(page, 'Nome de exibição')).toHaveAttribute('aria-invalid', 'true')
    await expect(field(page, 'Nome de exibição')).toHaveAccessibleDescription(REQUIRED)
    await expect(field(page, 'E-mail')).toHaveAccessibleDescription(REQUIRED)
  })

  for (const [network, valid, invalid] of [
    ['Ethereum', ETH_ADDRESS, '0x123'],
    ['Polygon', POLYGON_ADDRESS, ETH_ADDRESS.slice(0, -1)],
    ['Solana', SOLANA_ADDRESS, ETH_ADDRESS],
  ] as const) {
    test(`endereço inválido para ${network} mostra erro e foca o campo; válido salva`, async ({
      page,
    }) => {
      await login(page)
      await openWallets(page)
      await pick(page, /^Rede/, network)
      const address = field(page, 'Endereço da carteira')

      await address.fill(invalid)
      await save(page).click()
      await expect(address).toBeFocused()
      await expect(address).toHaveAccessibleDescription(INVALID_ADDRESS)

      await address.fill(valid)
      await save(page).click()
      await expect(page.getByRole('status').filter({ hasText: 'Carteira salva.' })).toBeVisible()
      await expect(address).toHaveAccessibleDescription('')
    })
  }

  test('usuário novo vê o formulário vazio e cadastra a carteira principal', async ({ page }) => {
    await register(page, `carteira${Date.now()}`)
    await openWallets(page)

    await expect(field(page, 'Nome de exibição')).toHaveValue('')
    await expect(field(page, 'Endereço da carteira')).toHaveValue('')
    await fillAll(page, ETH_ADDRESS)
    await save(page).click()
    await expect(page.getByRole('status').filter({ hasText: 'Carteira salva.' })).toBeVisible()

    await page.reload()
    await expect(field(page, 'Apelido da carteira')).toHaveValue('Minha carteira')
    await expect(field(page, 'Endereço da carteira')).toHaveValue(ETH_ADDRESS)
  })

  test('navegação por teclado alcança "Salvar carteira" com foco visível', async ({ page }) => {
    await login(page)
    await openWallets(page)

    await page.getByRole('textbox', { name: /^Nome ENS/ }).focus()
    await page.keyboard.press('Tab')
    await expect(save(page)).toBeFocused()
    await expect(save(page)).not.toHaveCSS('box-shadow', 'none')
  })

  test('erro ao carregar mostra "Tentar novamente" que recupera (S-03)', async ({ page }) => {
    await login(page)
    await gotoApp(page, '/carteiras', { scenario: 'S-03' })

    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível carregar suas carteiras' })
    await expect(alert).toBeVisible({ timeout: 20_000 })
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(field(page, 'Nome de exibição')).toBeVisible({ timeout: 20_000 })
    await expect(alert).toHaveCount(0)
  })
})
