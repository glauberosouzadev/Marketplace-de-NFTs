import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'
import { firstCartItem, listOrders, readyToConfirm, type CartItemRef } from './support/checkout'
import './support/mock-control'

const CONFIRMED = 'Seus NFTs agora estão na sua carteira'
const PENDING = 'Aguardando confirmação do pagamento…'

const ref = ({ nftId, editionId }: CartItemRef) => ({ nftId, editionId })
const pending = (page: Page) => page.getByRole('status').filter({ hasText: PENDING })
const noticeClose = (page: Page) =>
  page.locator('[data-notices]').getByRole('button', { name: 'Dispensar aviso' })
const notices = (page: Page) => page.getByRole('button', { name: 'Dispensar aviso' })
const subtotal = (page: Page) =>
  page
    .getByRole('region', { name: 'Resumo do pedido' })
    .locator('dt', { hasText: /^Subtotal$/ })
    .locator('xpath=following-sibling::dd[1]')

async function openCart(page: Page): Promise<CartItemRef> {
  await gotoApp(page, '/nft/nft-001')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
  await gotoApp(page, '/carrinho')
  await expect(subtotal(page)).toHaveText('1.19 ETH')
  await expect.poll(() => page.evaluate(() => window.__kurioRealtime?.status())).toBe('connected')
  return firstCartItem(page)
}

async function placePendingOrder(page: Page): Promise<string> {
  await readyToConfirm(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(pending(page)).toBeVisible()
  const all = await listOrders(page)
  expect(all).toHaveLength(1)
  expect(all[0]?.status).toBe('pending')
  return all[0]?.id ?? ''
}

test.describe('E2E-10 resiliência do tempo real', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'desktop')
  })

  test('(a)(b) duplicata e evento antigo: um único aviso, sem regressão', async ({ page }) => {
    const item = await openCart(page)

    await page.evaluate(
      (i) => {
        window.__kurioMock?.updateNft(i)
        window.__kurioMock?.replayLastEvent()
      },
      { ...ref(item), price: '1.5' },
    )

    const notice = page.getByRole('status').getByText(/^Preço de .* mudou: 1\.19 → 1\.5 ETH\.$/)
    await expect(notice).toHaveCount(1)
    await expect(subtotal(page)).toHaveText('1.5 ETH')
    await expect(notices(page)).toHaveCount(1)

    await page.evaluate((id) => window.__kurioMock?.emitStale({ type: 'nft', id }), item.nftId)
    // Evento novo na mesma conexão serve de ponto de sincronia (entrega em ordem).
    await page.evaluate((i) => window.__kurioMock?.updateNft(i), { ...ref(item), price: '1.6' })
    await expect(subtotal(page)).toHaveText('1.6 ETH')
    await expect(page.getByText(/mudou: 1\.5 → 1\.6 ETH/)).toHaveCount(1)
    await expect(page.getByText(/mudou: 1\.19 → 1\.5 ETH/)).toHaveCount(1)
    await expect(page.getByText(/→ 1\.19 ETH/)).toHaveCount(0)
    await expect(notices(page)).toHaveCount(2)
  })

  test('(c) queda com pedido pendente liquidado: após reconectar o recibo vem via REST', async ({
    page,
  }) => {
    const id = await placePendingOrder(page)
    await expect.poll(() => page.evaluate(() => window.__kurioRealtime?.status())).toBe('connected')

    await page.evaluate(() => window.__kurioMock?.dropRealtime())
    await expect(page.getByRole('status').getByText('Reconectando…')).toBeVisible()

    await page.evaluate((i) => window.__kurioMock?.settleOrder(i, 'confirmed'), id)
    // Evento perdido na queda: a UI segue como estava.
    await expect(pending(page)).toBeVisible()
    await expect(page.getByText(CONFIRMED)).toHaveCount(0)
    expect((await listOrders(page))[0]?.status).toBe('confirmed')

    await page.evaluate(() => window.__kurioMock?.restoreRealtime())

    // O recibo abre em diálogo modal; a região de avisos segue exposta na árvore de acessibilidade.
    await expect(page.getByRole('status').getByText('Reconectado')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/pedido/${id}`))
    await expect(page.getByText(CONFIRMED)).toBeVisible()
    expect(await listOrders(page)).toHaveLength(1)
  })

  test('(d) reload com pedido pendente recupera o estado real sem nova compra', async ({
    page,
  }) => {
    const id = await placePendingOrder(page)
    const posts: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/orders$/.test(r.url())) posts.push(r.url())
    })

    await page.reload()

    await expect(pending(page)).toBeVisible()
    await expect(page.getByText(CONFIRMED)).toHaveCount(0)
    const all = await listOrders(page)
    expect(all).toHaveLength(1)
    expect(all[0]?.id).toBe(id)
    expect(all[0]?.status).toBe('pending')
    expect(posts).toHaveLength(0)

    await page.evaluate((i) => window.__kurioMock?.settleOrder(i, 'confirmed'), id)
    await expect(page.getByText(CONFIRMED)).toBeVisible()
    expect(posts).toHaveLength(0)
    expect(await listOrders(page)).toHaveLength(1)
  })

  test('(e) evento antigo de pedido após confirmado não regride o recibo', async ({ page }) => {
    const id = await placePendingOrder(page)
    await page.evaluate((i) => window.__kurioMock?.settleOrder(i, 'confirmed'), id)
    await expect(page.getByText(CONFIRMED)).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.evaluate(() => window.__kurioMock?.dropRealtime())
    await expect(page.getByRole('status').getByText('Reconectando…')).toBeVisible()
    await page.evaluate(() => window.__kurioMock?.restoreRealtime())
    await expect(page.getByRole('status').getByText('Reconectado')).toBeVisible()
    await noticeClose(page).first().click()
    await expect(page.getByText('Reconectado')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/pedido/${id}`))

    await page.evaluate((i) => {
      window.__kurioMock?.emitStale({ type: 'order', id: i })
      window.__kurioMock?.replayLastEvent()
    }, id)
    // Ponto de sincronia: um evento novo e visível, entregue depois dos antigos.
    await page.evaluate(() => window.__kurioMock?.dropRealtime())
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('status').getByText('Reconectando…')).toBeVisible()

    await expect(page.getByText(CONFIRMED)).toBeVisible()
    await expect(pending(page)).toHaveCount(0)
    const all = await listOrders(page)
    expect(all).toHaveLength(1)
    expect(all[0]?.status).toBe('confirmed')
  })

  test('modal de login: dispensar aviso não o fecha; clique fora fecha', async ({ page }) => {
    await gotoApp(page, '/login')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.__kurioRealtime?.status())).toBe('connected')
    await page.evaluate(() => window.__kurioMock?.dropRealtime())
    await expect(page.getByRole('status').getByText('Reconectando…')).toBeVisible()
    await page.evaluate(() => window.__kurioMock?.restoreRealtime())
    await expect(page.getByRole('status').getByText('Reconectado')).toBeVisible()

    await noticeClose(page).first().click()

    await expect(page.getByText('Reconectado')).toHaveCount(0)
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/\/login/)

    await page.mouse.click(5, 5)
    await expect(dialog).toHaveCount(0)
    await expect(page).not.toHaveURL(/\/login/)
  })
})
