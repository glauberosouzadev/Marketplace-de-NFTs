import { expect, test, type Page } from '@playwright/test'
import { gotoApp, primaryWallet, secondaryWallet } from './support'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const ETH_ADDRESS = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f'
const REQUIRED = 'Campo obrigatório'
const INVALID_ADDRESS = 'Endereço inválido para a rede selecionada'
const EMPTY_TEXT = 'Você ainda não adicionou uma carteira secundária.'
const NO_PRIMARY = 'Cadastre a carteira principal primeiro.'

type Region = ReturnType<typeof primaryWallet>

const field = (region: Region, label: string) =>
  region.getByRole('textbox', { name: label, exact: true })
const save = (region: Region) => region.getByRole('button', { name: 'Salvar carteira' })
const saved = (region: Region) => region.getByRole('status').filter({ hasText: 'Carteira salva.' })

async function login(page: Page): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(ANA.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(ANA.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function register(page: Page): Promise<void> {
  const username = `sec${Date.now()}${Math.floor(Math.random() * 1000)}`
  await gotoApp(page, '/cadastro')
  await page.getByPlaceholder('Nome de usuário').fill(username)
  await page.getByPlaceholder('Digite seu e-mail').fill(`${username}@kurio.test`)
  await page.getByPlaceholder('Senha', { exact: true }).fill('Kurio@2026')
  await page.getByPlaceholder('Confirmar senha').fill('Kurio@2026')
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page).not.toHaveURL(/\/(login|cadastro)/)
}

async function openWallets(page: Page): Promise<void> {
  await gotoApp(page, '/carteiras')
  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  await expect(field(primaryWallet(page), 'Nome de exibição')).toBeVisible()
}

async function pick(region: Region, label: RegExp, option: string): Promise<void> {
  await region.getByRole('combobox', { name: label }).click()
  await region.page().getByRole('option', { name: option, exact: true }).click()
}

async function fillAll(region: Region, nickname: string, address: string): Promise<void> {
  await field(region, 'Nome de exibição').fill('Novo Colecionador')
  await field(region, 'Apelido da carteira').fill(nickname)
  await pick(region, /^Rede/, 'Ethereum')
  await field(region, 'Nome do perfil').fill('novo.colecionador')
  await field(region, 'Endereço da carteira').fill(address)
  await pick(region, /^Tipo de carteira/, 'MetaMask')
  await field(region, 'E-mail').fill('novo@kurio.test')
  await region.getByRole('textbox', { name: /^Nome ENS/ }).fill('novo')
}

async function registerWithPrimary(page: Page, nickname = 'Principal nova'): Promise<void> {
  await register(page)
  await openWallets(page)
  await fillAll(primaryWallet(page), nickname, ETH_ADDRESS)
  await save(primaryWallet(page)).click()
  await expect(saved(primaryWallet(page))).toBeVisible()
}

test.describe('@main @responsive E2E-08 carteiras: carteira secundária e apelido único', () => {
  test('usuário novo vê o estado vazio com "Adicionar" e "Igual à carteira principal"', async ({
    page,
  }) => {
    await register(page)
    await openWallets(page)
    const secondary = secondaryWallet(page)

    await expect(secondary.getByText(EMPTY_TEXT)).toBeVisible()
    await expect(secondary.getByRole('button', { name: 'Adicionar' })).toBeVisible()
    await expect(
      secondary.getByRole('button', { name: 'Igual à carteira principal' }),
    ).toBeVisible()
    await expect(secondary.getByRole('textbox')).toHaveCount(0)
  })

  test('"Adicionar" abre o formulário vazio e foca o primeiro campo', async ({ page }) => {
    await register(page)
    await openWallets(page)
    const secondary = secondaryWallet(page)

    await secondary.getByRole('button', { name: 'Adicionar' }).click()

    await expect(field(secondary, 'Nome de exibição')).toBeFocused()
    await expect(field(secondary, 'Nome de exibição')).toHaveValue('')
    await expect(field(secondary, 'Endereço da carteira')).toHaveValue('')
    await expect(secondary.getByText(EMPTY_TEXT)).toHaveCount(0)
  })

  test('obrigatórios vazios mostram erro no campo e focam o primeiro inválido', async ({
    page,
  }) => {
    await register(page)
    await openWallets(page)
    const secondary = secondaryWallet(page)
    await secondary.getByRole('button', { name: 'Adicionar' }).click()

    await save(secondary).click()

    await expect(field(secondary, 'Nome de exibição')).toBeFocused()
    await expect(field(secondary, 'Nome de exibição')).toHaveAttribute('aria-invalid', 'true')
    await expect(field(secondary, 'Nome de exibição')).toHaveAccessibleDescription(REQUIRED)
    await expect(field(secondary, 'E-mail')).toHaveAccessibleDescription(REQUIRED)
  })

  test('endereço fora do formato da rede mostra erro e foca o campo', async ({ page }) => {
    await register(page)
    await openWallets(page)
    const secondary = secondaryWallet(page)
    await secondary.getByRole('button', { name: 'Adicionar' }).click()
    await fillAll(secondary, 'Secundária', '0x123')

    await save(secondary).click()

    const address = field(secondary, 'Endereço da carteira')
    await expect(address).toBeFocused()
    await expect(address).toHaveAttribute('aria-invalid', 'true')
    await expect(address).toHaveAccessibleDescription(INVALID_ADDRESS)
    await expect(saved(secondaryWallet(page))).toHaveCount(0)
  })

  test('"Igual à carteira principal" copia os dados e só "Salvar carteira" persiste', async ({
    page,
  }) => {
    await registerWithPrimary(page)
    const secondary = secondaryWallet(page)

    await secondary.getByRole('button', { name: 'Igual à carteira principal' }).click()

    await expect(field(secondary, 'Nome de exibição')).toHaveValue('Novo Colecionador')
    await expect(field(secondary, 'Apelido da carteira')).toHaveValue('Principal nova')
    await expect(field(secondary, 'Endereço da carteira')).toHaveValue(ETH_ADDRESS)
    await expect(field(secondary, 'E-mail')).toHaveValue('novo@kurio.test')

    await page.reload()
    await expect(secondaryWallet(page).getByText(EMPTY_TEXT)).toBeVisible()

    await secondaryWallet(page).getByRole('button', { name: 'Igual à carteira principal' }).click()
    await save(secondaryWallet(page)).click()
    await expect(saved(secondaryWallet(page))).toBeVisible()
    await page.reload()
    await expect(secondaryWallet(page).getByText(EMPTY_TEXT)).toHaveCount(0)
    await expect(field(secondaryWallet(page), 'Endereço da carteira')).toHaveValue(ETH_ADDRESS)
  })

  test('salvar persiste após refresh e a secundária é editável', async ({ page }) => {
    await registerWithPrimary(page)
    const secondary = secondaryWallet(page)
    await secondary.getByRole('button', { name: 'Adicionar' }).click()
    await fillAll(secondary, 'Cofre secundário', ETH_ADDRESS)
    await save(secondary).click()
    await expect(saved(secondaryWallet(page))).toBeVisible()

    await page.reload()
    await expect(field(secondaryWallet(page), 'Apelido da carteira')).toHaveValue(
      'Cofre secundário',
    )

    await field(secondaryWallet(page), 'Apelido da carteira').fill('Cofre editado')
    await save(secondaryWallet(page)).click()
    await expect(saved(secondaryWallet(page))).toBeVisible()
    await page.reload()
    await expect(field(secondaryWallet(page), 'Apelido da carteira')).toHaveValue('Cofre editado')
  })

  test('apelido da principal editado no Perfil aparece em Carteiras e vice-versa', async ({
    page,
  }) => {
    await login(page)
    await gotoApp(page, '/perfil')
    const nickname = page.getByRole('textbox', { name: /^Apelido da carteira/ })
    await expect(nickname).not.toHaveValue('')
    await nickname.fill('Apelido via perfil')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Perfil salvo.' })).toBeVisible()

    await openWallets(page)
    await expect(field(primaryWallet(page), 'Apelido da carteira')).toHaveValue(
      'Apelido via perfil',
    )

    await field(primaryWallet(page), 'Apelido da carteira').fill('Apelido via carteiras')
    await save(primaryWallet(page)).click()
    await expect(saved(primaryWallet(page))).toBeVisible()
    await gotoApp(page, '/perfil')
    await expect(page.getByRole('textbox', { name: /^Apelido da carteira/ })).toHaveValue(
      'Apelido via carteiras',
    )
  })

  test('editar a secundária não altera o apelido do Perfil', async ({ page }) => {
    await login(page)
    await openWallets(page)
    const primaryNickname = await field(primaryWallet(page), 'Apelido da carteira').inputValue()
    const secondary = secondaryWallet(page)
    await expect(field(secondary, 'Apelido da carteira')).toHaveValue('Carteira secundária')

    await field(secondary, 'Apelido da carteira').fill('Só da secundária')
    await save(secondary).click()
    await expect(saved(secondaryWallet(page))).toBeVisible()

    await gotoApp(page, '/perfil')
    const nickname = page.getByRole('textbox', { name: /^Apelido da carteira/ })
    await expect(nickname).toHaveValue(primaryNickname)
    await expect(nickname).not.toHaveValue('Só da secundária')
  })

  test('sem carteira principal, "Igual…" avisa em role=status e não copia', async ({ page }) => {
    await register(page)
    await openWallets(page)
    const secondary = secondaryWallet(page)

    await secondary.getByRole('button', { name: 'Igual à carteira principal' }).click()

    await expect(secondary.getByRole('status').filter({ hasText: NO_PRIMARY })).toBeVisible()
    await expect(secondary.getByText(EMPTY_TEXT)).toBeVisible()
    await expect(secondary.getByRole('textbox')).toHaveCount(0)
  })
})
