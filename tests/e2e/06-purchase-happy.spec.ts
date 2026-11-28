import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const BOUGHT = { path: '/nft/nft-001', name: 'Emerald Ape' }
const EXTRA = { path: '/nft/nft-002', name: 'Sage Nomad' }
const CONFIRMED = 'Seus NFTs agora estão na sua carteira'

interface StoredOrder {
  id: string
  status: string
  explorerUrl?: string
  snapshot: {
    total: string
    networkFee: string
    wallet: { provider: string }
    lines: { quantity: number; lineTotal: string }[]
  }
}

const orders = (page: Page) =>
  page.evaluate(() => (window.__kurioMock?.listOrders() ?? []) as unknown as StoredOrder[])
const cartRow = (page: Page, name: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name }) })

async function addFromDetail(page: Page, path: string): Promise<void> {
  await gotoApp(page, path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
}

test.describe('@main E2E-06 compra completa até o recibo', () => {
  test('login, carrinho, pagamento, pendente, liquidação, recibo e baixa só do comprado', async ({
    page,
  }) => {
    await gotoApp(page, '/login')
    await page.getByLabel('E-mail', { exact: true }).fill(ANA.email)
    await page.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).not.toHaveURL(/\/login/)

    await addFromDetail(page, BOUGHT.path)
    await gotoApp(page, '/carrinho')
    await expect(cartRow(page, BOUGHT.name)).toBeVisible()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/pagamento/)

    // Validação do formulário antes de conectar: obrigatório vazio bloqueia o envio.
    const name = page.getByRole('textbox', { name: 'Nome de exibição', exact: true })
    await expect(name).toHaveValue('Ana Colecionadora')
    await name.fill('')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(name).toHaveAccessibleDescription('Campo obrigatório')
    expect(await orders(page)).toHaveLength(0)
    await name.fill('Ana Colecionadora')

    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Conexão:' })).toContainText(
      'Conectada',
    )
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    // Critério 1: pendente primeiro, sem recibo.
    await expect(
      page.getByRole('status').filter({ hasText: 'Aguardando confirmação do pagamento…' }),
    ).toBeVisible()
    await expect(page.getByText(CONFIRMED)).toHaveCount(0)
    const [pendingOrder] = await orders(page)
    expect(await orders(page)).toHaveLength(1)
    expect(pendingOrder?.status).toBe('pending')
    const id = pendingOrder?.id ?? ''

    // Item extra adicionado antes da liquidação (FR-37).
    await addFromDetail(page, EXTRA.path)
    await gotoApp(page, `/pedido/${id}`)
    await expect(page.getByText('Pedido aguardando confirmação')).toBeVisible()
    await expect(page.getByText(CONFIRMED)).toHaveCount(0)

    await page.evaluate((i) => window.__kurioMock?.settleOrder(i, 'confirmed'), id)

    // Critério 2: recibo reproduz o snapshot e marca o link como simulado.
    await expect(page.getByText(CONFIRMED)).toBeVisible()
    const order = (await orders(page)).find((o) => o.id === id)
    expect(order?.status).toBe('confirmed')
    const { snapshot } = order!
    expect(snapshot.wallet.provider).toBe('metamask')
    await expect(page.getByText('MetaMask', { exact: true })).toBeVisible()
    await expect(page.getByText(`${snapshot.networkFee} ETH`).first()).toBeVisible()
    await expect(page.getByText(`${snapshot.total} ETH`).first()).toBeVisible()
    const link = page.getByRole('link', { name: /Ver no Etherscan/ })
    await expect(link).toHaveAttribute('href', order?.explorerUrl ?? 'ausente')
    await expect(link).toContainText('link simulado')
    await expect(
      page.getByText('Link simulado: não corresponde a uma transação real.'),
    ).toBeVisible()

    // Critério 3: o carrinho perde só o comprado.
    await gotoApp(page, '/carrinho')
    await expect(cartRow(page, EXTRA.name)).toBeVisible()
    await expect(cartRow(page, BOUGHT.name)).toHaveCount(0)
    const remaining = await page.evaluate(() =>
      window.__kurioMock
        ?.listCarts()
        .filter((c) => c.owner.startsWith('user:'))
        .flatMap((c) => c.items.map((i) => [i.nftId, i.quantity])),
    )
    expect(remaining).toEqual([['nft-002', 1]])
  })
})
