import { expect, test, type Locator, type Page } from '@playwright/test'
import { gotoApp } from './support'

const ANA = {
  email: 'ana@kurio.test',
  password: 'Kurio@2026',
  name: 'Ana Colecionadora',
  uid: 'user-001',
}
const BRUNO = {
  email: 'bruno@kurio.test',
  password: 'Colecao#2026',
  name: 'Bruno Criador',
  uid: 'user-002',
}
const NFT_A = '/nft/nft-001' // Emerald Ape
const EXPIRED_TEXT = 'Sua sessão expirou. Entre novamente para continuar.'
const EXPIRED_SOURCE = EXPIRED_TEXT.replace(/\./g, '\\.')
const LOGOUT_GAP =
  'Lacuna FR-43: o mobile não tem "Sair" (menu do usuário só no cabeçalho desktop; "Perfil" da tab bar é inerte).'

const cartLink = (page: Page) =>
  page.getByRole('link', { name: 'Carrinho' }).filter({ visible: true })
const badge = (page: Page) => cartLink(page).locator('span[aria-hidden="true"]')
const accountMenu = (page: Page, name: string) =>
  page.getByRole('button', { name: `Menu da conta de ${name}` })
const anyAccountMenu = (page: Page) => page.getByRole('button', { name: /^Menu da conta de / })
const row = (page: Page, name: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name }) })
const formAlert = (page: Page) => page.locator('form').getByRole('alert')
// Toast é `span` dentro da lista de avisos; o aviso do formulário de login é `p`.
const expiredToasts = (page: Page) =>
  page.locator('span', { hasText: new RegExp(`^${EXPIRED_SOURCE}$`) })
const expiredFormNotice = (page: Page) => page.locator('form').getByRole('status')

// Os avisos não se auto-dispensam e cobrem o formulário em 390 px; fecha pelo "×" do próprio aviso.
async function dismiss(notice: Locator): Promise<void> {
  await expect(notice).toBeVisible()
  await notice.locator('xpath=following-sibling::button').click()
  await expect(notice).toHaveCount(0)
}

// Aviso único: no desktop o modal descreve-se pelo aviso do formulário e não há toast; no mobile o
// toast (que cobre o formulário em 390 px) é o aviso e é fechado. Um aviso tardio duplicado
// reaparece e é pego por `expectNoExpiredToast` depois do relogin.
async function expectExpiredNotice(page: Page, isMobile: boolean): Promise<void> {
  await expect(expiredFormNotice(page)).toHaveText(EXPIRED_TEXT)
  if (!isMobile) {
    await expect(page.getByRole('dialog')).toHaveAccessibleDescription(
      new RegExp(`^${EXPIRED_SOURCE}`),
    )
    await expect(expiredToasts(page)).toHaveCount(0)
    return
  }
  await expect(expiredToasts(page)).toHaveCount(1)
  await dismiss(expiredToasts(page))
}

const expectNoExpiredToast = (page: Page) => expect(expiredToasts(page)).toHaveCount(0)

async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.getByPlaceholder('contato@email.com').fill(email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

// Sem recarregar: o cache em memória de quem saiu continua no processo e precisa ter sido limpo.
async function loginFromHeader(page: Page, user: typeof ANA): Promise<void> {
  await page.getByRole('link', { name: 'Entrar' }).click()
  await fillLogin(page, user.email, user.password)
  await expect(page).not.toHaveURL(/\/login/)
}

async function login(page: Page, user: typeof ANA, redirect = '/'): Promise<void> {
  await gotoApp(
    page,
    redirect === '/' ? '/login' : `/login?redirect=${encodeURIComponent(redirect)}`,
  )
  await fillLogin(page, user.email, user.password)
  await expect(page).not.toHaveURL(/\/login/)
}

async function fillRegister(
  page: Page,
  values: { username: string; email: string; password: string },
): Promise<void> {
  await page.getByPlaceholder('Nome de usuário').fill(values.username)
  await page.getByPlaceholder('Digite seu e-mail').fill(values.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(values.password)
  await page.getByPlaceholder('Confirmar senha').fill(values.password)
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
}

async function addToCart(page: Page, path: string, quantity: number): Promise<void> {
  await gotoApp(page, path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByLabel('Qtd.').fill(String(quantity))
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await dismiss(page.getByText(/^Adicionado ao carrinho:/))
}

async function openCart(page: Page): Promise<void> {
  await gotoApp(page, '/carrinho')
  await expect(page.getByRole('heading', { level: 1, name: 'Carrinho de NFTs' })).toBeVisible()
}

// Linha e cotação carregadas: nenhum pedido pendente pode receber o 401 antes da ação do teste.
async function expectCartSettled(page: Page): Promise<void> {
  await expect(row(page, 'Emerald Ape').getByText(/^Edição: /)).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Resumo do pedido' })
      .locator('dt', { hasText: /^Total$/ })
      .locator('xpath=following-sibling::dd[1]'),
  ).toHaveText(/ETH$/)
}

const cartOf = (page: Page, uid: string) =>
  page.evaluate(
    (owner) =>
      window.__kurioMock
        ?.listCarts()
        .find((c) => c.owner === owner)
        ?.items.map((i) => [i.editionId, i.quantity]) ?? [],
    `user:${uid}`,
  )

const storedUid = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('kurio:session')
    return raw ? (JSON.parse(raw) as { uid: string }).uid : null
  })

const CHECKOUT_DRAFT = (uid: string) => `kurio:u:${uid}:checkout`

const writeCheckoutDraft = (page: Page, uid: string) =>
  page.evaluate(
    (key) => localStorage.setItem(key, '{"walletId":"wallet-001"}'),
    CHECKOUT_DRAFT(uid),
  )

const userKeys = (page: Page, uid: string) =>
  page.evaluate(
    (prefix) => Object.keys(localStorage).filter((k) => k.startsWith(prefix)),
    `kurio:u:${uid}:`,
  )

async function signOut(page: Page, user: typeof ANA): Promise<void> {
  await accountMenu(page, user.name).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/\?panel=0$|\/$/)
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
}

test.describe('@main E2E-03 cadastro, login, expiração e troca de usuário', () => {
  test('S-05: e-mail e usuário em uso erram no próprio campo; cadastro válido inicia a sessão e volta à origem', async ({
    page,
    isMobile,
  }) => {
    await gotoApp(page, `/cadastro?redirect=${encodeURIComponent(NFT_A)}`)
    const username = page.getByPlaceholder('Nome de usuário')
    const email = page.getByPlaceholder('Digite seu e-mail')

    await fillRegister(page, {
      username: 'novo.colecionador',
      email: ANA.email,
      password: 'Segura123',
    })
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription('Este e-mail já está em uso.')
    await expect(username).toHaveAttribute('aria-invalid', 'false')
    await expect(page).toHaveURL(/\/cadastro/)

    await fillRegister(page, {
      username: 'ana.colecionadora',
      email: 'novo@kurio.test',
      password: 'Segura123',
    })
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    await expect(username).toHaveAccessibleDescription('Este nome de usuário já está em uso.')
    await expect(email).toHaveAttribute('aria-invalid', 'false')
    await expect(page).toHaveURL(/\/cadastro/)
    expect(await storedUid(page)).toBeNull()

    await fillRegister(page, {
      username: 'novo.colecionador',
      email: 'novo@kurio.test',
      password: 'Segura123',
    })
    await expect(page).toHaveURL(new RegExp(`${NFT_A}$`))
    expect(await storedUid(page)).toBe('user-003')
    if (!isMobile) await expect(accountMenu(page, 'novo.colecionador')).toBeVisible()

    // A sessão vale no servidor simulado: o item vai para o carrinho do novo usuário.
    await addToCart(page, NFT_A, 1)
    expect(await cartOf(page, 'user-003')).toEqual([['nft-001-ed-1', 1]])
  })

  test('login inválido mostra mensagem genérica; válido volta à origem do redirect', async ({
    page,
    isMobile,
  }) => {
    await gotoApp(page, `/login?redirect=${encodeURIComponent(NFT_A)}`)
    const email = page.getByPlaceholder('contato@email.com')
    const password = page.getByPlaceholder('Senha', { exact: true })

    await fillLogin(page, ANA.email, 'SenhaErrada1')
    await expect(formAlert(page)).toHaveText('E-mail ou senha incorretos.')
    await expect(email).toHaveAttribute('aria-invalid', 'false')
    await expect(password).toHaveAttribute('aria-invalid', 'false')

    // E-mail inexistente recebe a mesma mensagem: não revela qual campo falhou.
    await fillLogin(page, 'ninguem@kurio.test', ANA.password)
    await expect(formAlert(page)).toHaveText('E-mail ou senha incorretos.')
    await expect(page).toHaveURL(/\/login/)
    expect(await storedUid(page)).toBeNull()

    await fillLogin(page, ANA.email, ANA.password)
    await expect(page).toHaveURL(new RegExp(`${NFT_A}$`))
    expect(await storedUid(page)).toBe(ANA.uid)
    if (!isMobile) await expect(accountMenu(page, ANA.name)).toBeVisible()
  })

  test('expireSession(): ação com 401 leva ao login com aviso e redirect; relogin volta ao carrinho', async ({
    page,
    isMobile,
  }) => {
    await login(page, ANA)
    await addToCart(page, NFT_A, 1)
    await openCart(page)
    await expectCartSettled(page)
    await writeCheckoutDraft(page, ANA.uid)

    await page.evaluate(() => window.__kurioMock?.expireSession())
    await page.getByRole('button', { name: /^Aumentar quantidade de Emerald Ape/ }).click()

    await expect(page).toHaveURL(/\/login\?redirect=%2Fcarrinho(%3Fpanel%3D0)?&reason=expired$/)
    await expectExpiredNotice(page, isMobile)
    expect(await storedUid(page)).toBeNull()
    // Q-26: a expiração mantém o rascunho do usuário para o relogin.
    expect(await userKeys(page, ANA.uid)).toEqual([CHECKOUT_DRAFT(ANA.uid)])

    await fillLogin(page, ANA.email, ANA.password)
    await expect(page).toHaveURL(/\/carrinho/)
    await expect(row(page, 'Emerald Ape').getByLabel('Quantidade', { exact: true })).toHaveText('1')
    expect(await cartOf(page, ANA.uid)).toEqual([['nft-001-ed-1', 1]])
    expect(await userKeys(page, ANA.uid)).toEqual([CHECKOUT_DRAFT(ANA.uid)])
    await expectNoExpiredToast(page)
  })

  test('expireSession(): navegação com 401 leva ao login com aviso e redirect para a página', async ({
    page,
    isMobile,
  }) => {
    await login(page, ANA)
    await gotoApp(page, NFT_A)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.evaluate(() => window.__kurioMock?.expireSession())
    await page.reload()

    await expect(page).toHaveURL(
      new RegExp(`/login\\?redirect=${encodeURIComponent(NFT_A)}(%3Fpanel%3D0)?&reason=expired$`),
    )
    await expectExpiredNotice(page, isMobile)

    await fillLogin(page, ANA.email, ANA.password)
    await expect(page).toHaveURL(new RegExp(`${NFT_A}(\\?panel=0)?$`))
    expect(await storedUid(page)).toBe(ANA.uid)
    await expectNoExpiredToast(page)
  })

  test('troca A → B após expiração: B não vê carrinho, nome nem armazenamento de A', async ({
    page,
    isMobile,
  }) => {
    await login(page, ANA)
    await addToCart(page, NFT_A, 2)
    await openCart(page)
    await expectCartSettled(page)
    await writeCheckoutDraft(page, ANA.uid)

    await page.evaluate(() => window.__kurioMock?.expireSession())
    await page.getByRole('button', { name: /^Aumentar quantidade de Emerald Ape/ }).click()
    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await expectExpiredNotice(page, isMobile)
    expect(await userKeys(page, ANA.uid)).toEqual([CHECKOUT_DRAFT(ANA.uid)])

    // Sem recarregar: o que estava em memória de A não pode aparecer para B.
    await fillLogin(page, BRUNO.email, BRUNO.password)
    await expect(page).toHaveURL(/\/carrinho/)
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expect(row(page, 'Emerald Ape')).toHaveCount(0)
    await expect(page.getByText(ANA.name)).toHaveCount(0)
    if (!isMobile) await expect(accountMenu(page, BRUNO.name)).toBeVisible()
    expect(await storedUid(page)).toBe(BRUNO.uid)
    expect(await userKeys(page, ANA.uid)).toEqual([])
    await expectNoExpiredToast(page)

    await gotoApp(page, '/')
    await expect(cartLink(page)).toBeVisible()
    await expect(badge(page)).toHaveCount(0)
    await expect(page.getByText(ANA.name)).toHaveCount(0)
    if (!isMobile) await expect(accountMenu(page, BRUNO.name)).toBeVisible()

    expect(await cartOf(page, BRUNO.uid)).toEqual([])
    expect(await cartOf(page, ANA.uid)).toEqual([['nft-001-ed-1', 2]])
  })

  test('logout volta a / e o botão voltar não reexibe dado privado', async ({ page, isMobile }) => {
    test.skip(isMobile, LOGOUT_GAP)
    await login(page, ANA)
    await addToCart(page, NFT_A, 1)
    await cartLink(page).click()
    await expect(row(page, 'Emerald Ape')).toBeVisible()
    await writeCheckoutDraft(page, ANA.uid)

    await signOut(page, ANA)
    expect(await storedUid(page)).toBeNull()
    expect(await userKeys(page, ANA.uid)).toEqual([])
    await expect(badge(page)).toHaveCount(0)

    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(anyAccountMenu(page)).toHaveCount(0)
    await expect(page.getByText(ANA.name)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(badge(page)).toHaveCount(0)

    await cartLink(page).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expect(row(page, 'Emerald Ape')).toHaveCount(0)
  })

  test('logout de A e login de B não exibem carrinho, nome nem dados de A', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, LOGOUT_GAP)
    await login(page, ANA)
    await addToCart(page, NFT_A, 2)
    await gotoApp(page, '/')
    await expect(accountMenu(page, ANA.name)).toBeVisible()
    await expect(badge(page)).toHaveText('2')
    await writeCheckoutDraft(page, ANA.uid)

    await signOut(page, ANA)
    expect(await userKeys(page, ANA.uid)).toEqual([])
    // Reescrito como se tivesse sobrado de A: o login de B precisa descartá-lo.
    await writeCheckoutDraft(page, ANA.uid)
    await loginFromHeader(page, BRUNO)

    await expect(accountMenu(page, BRUNO.name)).toBeVisible()
    await expect(page.getByText(ANA.name)).toHaveCount(0)
    await expect(badge(page)).toHaveCount(0)
    expect(await storedUid(page)).toBe(BRUNO.uid)
    expect(await userKeys(page, ANA.uid)).toEqual([])

    await accountMenu(page, BRUNO.name).click()
    await expect(page.getByRole('menu').getByText(BRUNO.email)).toBeVisible()
    await expect(page.getByText(ANA.email)).toHaveCount(0)
    await page.keyboard.press('Escape')

    await cartLink(page).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expect(row(page, 'Emerald Ape')).toHaveCount(0)
    expect(await cartOf(page, BRUNO.uid)).toEqual([])
    expect(await cartOf(page, ANA.uid)).toEqual([['nft-001-ed-1', 2]])
  })
})
