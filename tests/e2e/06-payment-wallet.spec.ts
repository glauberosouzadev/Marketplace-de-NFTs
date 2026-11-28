import { expect, test, type Page } from '@playwright/test'
import { gotoApp, primaryWallet } from './support'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const ETH_ADDRESS = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f'
const REQUIRED = 'Campo obrigatório'
const REJECTED_TEXT = 'A carteira recusou a conexão. Tente novamente ou escolha outro provedor.'
const DISCONNECTED_TEXT =
  'A carteira foi desconectada. Conecte-a novamente para confirmar a compra.'

const field = (page: Page, label: string) => page.getByRole('textbox', { name: label, exact: true })
const connection = (page: Page) => page.getByRole('status').filter({ hasText: 'Conexão:' })
const confirm = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const blockAlert = (page: Page) => page.getByRole('alert').filter({ hasText: /\S/ })

async function login(page: Page): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(ANA.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(ANA.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
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

async function openPayment(page: Page): Promise<void> {
  await gotoApp(page, '/nft/nft-001')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
  await gotoApp(page, '/pagamento')
  await expect(page).toHaveURL(/\/pagamento/)
  await expect(
    page.getByRole('heading', { level: 2, name: 'Perfil do colecionador' }),
  ).toBeVisible()
}

async function orders(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__kurioMock?.listOrders() ?? [])
}

test.describe('@main @responsive E2E-06 pagamento: formulário, carteira e conexão', () => {
  test('(1) campos pré-preenchidos do perfil e da carteira', async ({ page }) => {
    await login(page)
    await openPayment(page)

    await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Colecionadora')
    await expect(field(page, 'Endereço da carteira')).toHaveValue(ETH_ADDRESS)
    await expect(page.getByRole('combobox', { name: /^Rede\*?$/ })).toContainText('Ethereum')
    await expect(page.getByRole('combobox', { name: /^Tipo de carteira/ }).first()).toContainText(
      'MetaMask',
    )
    await expect(field(page, 'E-mail')).not.toHaveValue('')
    await expect(
      page.getByRole('textbox', { name: 'Código de indicação', exact: true }),
    ).not.toHaveAttribute('aria-required', 'true')
  })

  test('(1) obrigatório vazio mostra erro ao sair do campo', async ({ page }) => {
    await login(page)
    await openPayment(page)

    await field(page, 'Nome de exibição').fill('')
    await field(page, 'Nome de exibição').blur()

    await expect(field(page, 'Nome de exibição')).toHaveAttribute('aria-invalid', 'true')
    await expect(field(page, 'Nome de exibição')).toHaveAccessibleDescription(REQUIRED)
  })

  test('(1) ao enviar mostra os erros e foca o primeiro inválido', async ({ page }) => {
    await login(page)
    await openPayment(page)

    await field(page, 'E-mail').fill('')
    await field(page, 'Nome de exibição').fill('')
    await confirm(page).click()

    await expect(field(page, 'Nome de exibição')).toBeFocused()
    await expect(field(page, 'Nome de exibição')).toHaveAccessibleDescription(REQUIRED)
    await expect(field(page, 'E-mail')).toHaveAccessibleDescription(REQUIRED)
  })

  test('(2) lista a carteira com rótulo, endereço abreviado e rede', async ({ page }) => {
    await login(page)
    await openPayment(page)

    const card = page.locator('label').filter({ hasText: 'Rede principal' })
    await expect(card).toHaveCount(1)
    await expect(card.getByRole('radio')).toBeChecked()
    await expect(card).toContainText('Principal')
    await expect(card).toContainText(/0x71c7…976f|\.eth/)
    await expect(card).toContainText('Rede principal Ethereum')
    const reserve = page.locator('label').filter({ hasText: 'Reserva' })
    await expect(reserve).toContainText(/Rede (Ethereum|Polygon|Solana)/)
    await expect(page.getByRole('link', { name: /^Editar carteira / })).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Trocar carteira' })).toBeVisible()
  })

  test('(2) sem carteira mostra link para /carteiras', async ({ page }) => {
    await register(page, `semcarteira${Date.now()}`)
    await openPayment(page)

    await expect(page.getByText('Você ainda não tem carteira cadastrada.')).toBeVisible()
    const link = page.getByRole('link', { name: 'Cadastrar carteira' })
    await expect(link).toHaveAttribute('href', /\/carteiras/)
    await link.click()
    await expect(page).toHaveURL(/\/carteiras/)
  })

  test('(3) conectar mostra "conectando" e depois "conectada"', async ({ page }) => {
    await login(page)
    await openPayment(page)
    await expect(connection(page)).toContainText('Não conectada')

    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(connection(page)).toContainText('Conectando…')
    await expect(connection(page)).toContainText('Conectada', { timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 2, name: 'Carteira conectada' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible()
  })

  test('(3) recusa mostra "recusada", bloqueia a compra em role=alert e não cria pedido', async ({
    page,
  }) => {
    await login(page)
    await openPayment(page)
    await page.evaluate(() => window.__kurioMock?.rejectNextConnection())

    await page.getByRole('button', { name: 'Conectar carteira' }).click()

    await expect(connection(page)).toContainText('Recusada', { timeout: 15_000 })
    await expect(blockAlert(page)).toHaveText(REJECTED_TEXT)
    await confirm(page).click()
    await expect(blockAlert(page)).toHaveText(REJECTED_TEXT)
    expect(await orders(page)).toHaveLength(0)
    await expect(page).toHaveURL(/\/pagamento/)
  })

  test('(3) "Desconectar" mostra "desconectada" e bloqueia a compra sem criar pedido', async ({
    page,
  }) => {
    await login(page)
    await openPayment(page)
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(connection(page)).toContainText('Conectada', { timeout: 15_000 })

    await page.getByRole('button', { name: 'Desconectar' }).click()

    await expect(connection(page)).toContainText('Desconectada')
    await expect(blockAlert(page)).toHaveText(DISCONNECTED_TEXT)
    await confirm(page).click()
    await expect(blockAlert(page)).toHaveText(DISCONNECTED_TEXT)
    expect(await orders(page)).toHaveLength(0)
  })

  test('(2) cadastrar carteira volta ao pagamento e a carteira salva aparece na lista', async ({
    page,
  }) => {
    await register(page, `retorno${Date.now()}`)
    await openPayment(page)
    await page.getByRole('link', { name: 'Cadastrar carteira' }).click()
    await expect(page).toHaveURL(/\/carteiras\?redirect=%2Fpagamento/)
    // A URL muda antes da troca de tela: o formulário do pagamento tem os mesmos rótulos.
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()

    const wallet = primaryWallet(page)
    await field(page, 'Nome de exibição').fill('Nova Pessoa')
    await field(page, 'Apelido da carteira').fill('Minha carteira')
    await field(page, 'Nome do perfil').fill('nova_pessoa')
    await field(page, 'Endereço da carteira').fill(ETH_ADDRESS)
    await field(page, 'E-mail').fill('nova@kurio.test')
    await wallet.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('nova')
    await wallet.getByRole('combobox', { name: /^Rede/ }).click()
    await page.getByRole('option', { name: 'Ethereum' }).click()
    await wallet.getByRole('combobox', { name: /^Tipo de carteira/ }).click()
    await page.getByRole('option', { name: 'MetaMask' }).click()
    await wallet.getByRole('button', { name: 'Salvar carteira' }).click()

    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.locator('label').filter({ hasText: 'Minha carteira' })).toBeVisible()
  })

  test('(4) "Usar outra carteira?" edita só para o pedido e o cadastro permanece', async ({
    page,
  }) => {
    await login(page)
    await openPayment(page)
    await expect(field(page, 'Endereço da carteira')).toBeDisabled()

    await page.getByRole('checkbox', { name: 'Usar outra carteira?' }).click()
    await expect(field(page, 'Endereço da carteira')).toBeEnabled()
    await field(page, 'Endereço da carteira').fill('0x2a6a3b1f0d9c4e8b7a5f3c1d9e8b7a6c5d4e3f2a')
    await field(page, 'Nome de exibição').fill('Outra Pessoa')

    await gotoApp(page, '/carteiras')
    await expect(
      primaryWallet(page).getByRole('textbox', { name: 'Endereço da carteira', exact: true }),
    ).toHaveValue(ETH_ADDRESS)
    await expect(
      primaryWallet(page).getByRole('textbox', { name: 'Nome de exibição', exact: true }),
    ).toHaveValue('Ana Colecionadora')
  })

  test('(5) sem overflow horizontal e teclado alcança "Confirmar compra"', async ({ page }) => {
    await login(page)
    await openPayment(page)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await confirm(page).focus()
    await expect(confirm(page)).toBeFocused()
    await expect(confirm(page)).not.toHaveCSS('box-shadow', 'none')
  })
})
