import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'

const NFT_A = '/nft/nft-001' // edição 1/10: 1.19 ETH, 3 disponíveis
const NFT_B = '/nft/nft-002' // edição 1/10: 1.69 ETH, 5 disponíveis
const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }

const summary = (page: Page) => page.getByRole('region', { name: 'Resumo do pedido' })
const cartLink = (page: Page) =>
  page.getByRole('link', { name: 'Carrinho' }).filter({ visible: true })
const badge = (page: Page) => cartLink(page).locator('span[aria-hidden="true"]')

// Badge no Início, onde header (desktop) e tab bar (mobile) existem; `count` 0 = oculto.
async function expectBadge(page: Page, count: number): Promise<void> {
  await gotoApp(page, '/')
  await expect(cartLink(page)).toBeVisible()
  if (count === 0) await expect(badge(page)).toHaveCount(0)
  else await expect(badge(page)).toHaveText(String(count))
}
const row = (page: Page, name: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name }) })

// Os avisos não se auto-dispensam e podem cobrir o sheet do resumo em 390 px: espera o aviso
// específico e o fecha pelo "×" dele.
async function dismissNotice(page: Page, text: string | RegExp): Promise<void> {
  const notice = page.getByText(text)
  await expect(notice).toBeVisible()
  await notice.locator('xpath=following-sibling::button').click()
  await expect(notice).toHaveCount(0)
}

async function addFromDetail(page: Page, path: string, quantity: number): Promise<void> {
  await gotoApp(page, path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByLabel('Qtd.').fill(String(quantity))
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await dismissNotice(page, /^Adicionado ao carrinho:/)
}

// A tab bar do mobile só existe no Início; o carrinho abre por URL (estado vem do armazenamento).
async function openCart(page: Page): Promise<void> {
  await gotoApp(page, '/carrinho')
  await expect(page.getByRole('heading', { level: 1, name: 'Carrinho de NFTs' })).toBeVisible()
}

async function login(page: Page): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(ANA.email)
  await page.getByPlaceholder('Senha').fill(ANA.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

// Total = subtotal - desconto + taxa Ethereum (0.0025); valores vêm da cotação do mock.
const value = (page: Page, term: string) =>
  summary(page)
    .locator('dt', { hasText: new RegExp(`^${term}$`) })
    .locator('xpath=following-sibling::dd[1]')

test.describe('@main E2E-05 carrinho, cupom e merge no login', () => {
  test('itens do detalhe aparecem em /carrinho, persistem no reload e o badge soma as quantidades', async ({
    page,
  }) => {
    await addFromDetail(page, NFT_A, 1)
    await addFromDetail(page, NFT_B, 2)
    await expectBadge(page, 3)

    await openCart(page)
    await expect(row(page, 'Emerald Ape')).toBeVisible()
    await expect(row(page, 'Sage Nomad')).toBeVisible()
    await expect(row(page, 'Sage Nomad').getByLabel('Quantidade', { exact: true })).toHaveText('2')
    await expect(value(page, 'Subtotal')).toHaveText('4.57 ETH')
    await expect(value(page, 'Total')).toHaveText('4.5725 ETH')

    await page.reload()

    await expect(row(page, 'Emerald Ape')).toBeVisible()
    await expect(row(page, 'Sage Nomad').getByLabel('Quantidade', { exact: true })).toHaveText('2')
    await expect(value(page, 'Total')).toHaveText('4.5725 ETH')
    await expectBadge(page, 3)
  })

  test('alterar quantidade e remover recalculam o resumo pela cotação', async ({ page }) => {
    await addFromDetail(page, NFT_A, 1)
    await addFromDetail(page, NFT_B, 1)
    await openCart(page)
    await expect(value(page, 'Subtotal')).toHaveText('2.88 ETH')

    await page.getByRole('button', { name: /^Aumentar quantidade de Emerald Ape/ }).click()
    await expect(value(page, 'Subtotal')).toHaveText('4.07 ETH')
    await dismissNotice(page, /^Quantidade de Emerald Ape.* alterada para 2\./)

    await page.getByRole('button', { name: /^Remover Sage Nomad/ }).click()
    await expect(row(page, 'Sage Nomad')).toHaveCount(0)
    await expect(value(page, 'Subtotal')).toHaveText('2.38 ETH')
    await expect(value(page, 'Total')).toHaveText('2.3825 ETH')
    await dismissNotice(page, /Sage Nomad.* removido do carrinho\./)

    await page.getByRole('button', { name: /^Remover Emerald Ape/ }).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expectBadge(page, 0)
  })

  test('S-06: KURIO10 desconta, EXPIRADO20 e PAUSADO15 erram sem alterar o resumo e remover recota', async ({
    page,
  }) => {
    await addFromDetail(page, NFT_A, 2)
    await openCart(page)
    await expect(value(page, 'Subtotal')).toHaveText('2.38 ETH')
    await expect(value(page, 'Desconto do lançamento')).toHaveText('(-) 00.00')
    await expect(value(page, 'Total')).toHaveText('2.3825 ETH')

    const field = summary(page).getByLabel('Código promocional')
    const apply = summary(page).getByRole('button', { name: 'Aplicar' })

    await field.fill('EXPIRADO20')
    await apply.click()
    await expect(summary(page).getByRole('alert')).toHaveText('Este cupom expirou.')
    await expect(value(page, 'Desconto do lançamento')).toHaveText('(-) 00.00')
    await expect(value(page, 'Total')).toHaveText('2.3825 ETH')

    await field.fill('PAUSADO15')
    await expect(summary(page).getByText('Este cupom expirou.')).toHaveCount(0)
    await apply.click()
    await expect(summary(page).getByRole('alert')).toHaveText('Cupom inválido.')
    await expect(value(page, 'Desconto do lançamento')).toHaveText('(-) 00.00')
    await expect(value(page, 'Total')).toHaveText('2.3825 ETH')

    await field.fill('KURIO10')
    await apply.click()
    await expect(summary(page).getByText('KURIO10', { exact: true })).toBeVisible()
    await expect(value(page, 'Desconto do lançamento')).toHaveText('(-) 0.238 ETH')
    await expect(value(page, 'Total')).toHaveText('2.1445 ETH')

    await page.reload()
    await expect(value(page, 'Desconto do lançamento')).toHaveText('(-) 0.238 ETH')

    await summary(page).getByRole('button', { name: 'Remover cupom' }).click()
    await expect(summary(page).getByLabel('Código promocional')).toBeVisible()
    await expect(value(page, 'Desconto do lançamento')).toHaveText('(-) 00.00')
    await expect(value(page, 'Total')).toHaveText('2.3825 ETH')
  })

  test('login com itens de visitante soma colisões limitadas ao disponível e anuncia o ajuste (Q-19)', async ({
    page,
  }) => {
    // Visitante 1: 2 de Emerald Ape; o login leva a linha para o carrinho da Ana.
    await addFromDetail(page, NFT_A, 2)
    await login(page)
    await openCart(page)
    await expect(row(page, 'Emerald Ape').getByLabel('Quantidade', { exact: true })).toHaveText('2')

    // Um contexto novo reiniciaria o banco do mock (persistido em localStorage); por isso só
    // a sessão e o id de visitante são removidos. Nova sessão de visitante (token e id de visitante descartados); o carrinho da Ana fica no mock.
    await page.evaluate(() => {
      localStorage.removeItem('kurio:session')
      localStorage.removeItem('kurio:guestCartId')
    })
    await page.reload()
    await expectBadge(page, 0)

    // Visitante 2: 2 de Emerald Ape (colide: 2 + 2 > 3 disponíveis) e 1 de Sage Nomad.
    await addFromDetail(page, NFT_A, 2)
    await addFromDetail(page, NFT_B, 1)
    await login(page)

    const notice = page.getByText(/Juntamos seu carrinho ao da sua conta\./)
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('reduzida de 4 para 3')
    await dismissNotice(page, /Juntamos seu carrinho ao da sua conta\./)

    await openCart(page)
    await expect(row(page, 'Emerald Ape').getByLabel('Quantidade', { exact: true })).toHaveText('3')
    await expect(row(page, 'Sage Nomad').getByLabel('Quantidade', { exact: true })).toHaveText('1')
    await expectBadge(page, 4)

    const anaCart = await page.evaluate(() =>
      window.__kurioMock
        ?.listCarts()
        .find((c) => c.owner.startsWith('user:'))
        ?.items.map((i) => [i.editionId, i.quantity]),
    )
    expect(anaCart).toEqual([
      ['nft-001-ed-1', 3],
      ['nft-002-ed-1', 1],
    ])
  })
})
