import { expect, test, type Page } from '@playwright/test'
import type { Order } from '@/contracts'
import {
  connectedWalletId,
  connectionStatus,
  readyToConfirm as ready,
  recordOrderKeys,
} from './support/checkout'

const PENDING = 'Aguardando confirmação do pagamento…'
const REJECTED = 'Pagamento recusado. Seus itens continuam no carrinho.'
const DISCONNECTED = 'A carteira foi desconectada. Conecte-a novamente para confirmar a compra.'
/** `VITE_HTTP_TIMEOUT_MS` do build; o mock de S-08 segura a resposta por mais que isso. */
const HTTP_TIMEOUT_MS = 5000

const confirm = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const connection = connectionStatus
const pending = (page: Page) => page.getByRole('status').filter({ hasText: PENDING })

const orders = (page: Page) =>
  page.evaluate(() => (window.__kurioMock?.listOrders() ?? []) as unknown as Order[])
const cartItems = (page: Page) =>
  page.evaluate(() =>
    (window.__kurioMock?.listCarts() ?? [])
      .filter((c) => c.owner.startsWith('user:'))
      .flatMap((c) => c.items.map((i) => [i.nftId, i.quantity])),
  )
test.describe('@main E2E-07 recusa, clique repetido e timeout com o mesmo pedido', () => {
  test('(1) recusa preserva itens; só "Tentar novamente" cria o segundo pedido', async ({
    page,
  }) => {
    await ready(page)
    const keys = await recordOrderKeys(page)
    await confirm(page).click()
    await expect(pending(page)).toBeVisible()
    const [first] = await orders(page)
    expect(first?.status).toBe('pending')

    await page.evaluate((id) => window.__kurioMock?.settleOrder(id, 'rejected'), first!.id)

    await expect(page.getByRole('status').filter({ hasText: REJECTED })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Seus NFTs' }).getByRole('listitem')).toHaveCount(
      1,
    )
    expect(await cartItems(page)).toEqual([['nft-001', 1]])
    // Estado terminal estável: a ação explícita ainda está na tela e o recusado segue sozinho.
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled()
    expect((await orders(page)).map((o) => [o.id, o.status])).toEqual([[first!.id, 'rejected']])

    await page.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(pending(page)).toBeVisible()
    const all = await orders(page)
    expect(all).toHaveLength(2)
    const second = all.find((o) => o.id !== first!.id)
    expect(all.find((o) => o.id === first!.id)?.status).toBe('rejected')
    expect(second?.status).toBe('pending')
    expect(second?.idempotencyKey).not.toBe(first!.idempotencyKey)
    // Um envio automático após a recusa teria deixado uma terceira chave.
    expect(await keys()).toEqual([first!.idempotencyKey, second!.idempotencyKey])
  })

  test('(2) cliques repetidos no mesmo instante resultam em um único pedido', async ({ page }) => {
    await ready(page)
    const keys = await recordOrderKeys(page)

    // Três cliques no mesmo tick, antes de o React desabilitar o botão.
    await confirm(page).evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
      button.click()
    })

    await expect(pending(page)).toBeVisible()
    const all = await orders(page)
    expect(all).toHaveLength(1)
    expect(await keys()).toEqual([all[0]!.idempotencyKey])
  })

  test('(3) S-08: o page.clock estoura o timeout e o reenvio recupera o mesmo pedido', async ({
    page,
  }) => {
    await ready(page, 'S-08')
    const keys = await recordOrderKeys(page)
    await page.clock.install()

    await confirm(page).click()

    // O mock cria o pedido e segura a resposta além do timeout do cliente.
    await expect.poll(() => orders(page).then((o) => o.length)).toBe(1)
    const [created] = await orders(page)
    await page.clock.runFor(HTTP_TIMEOUT_MS - 1000)
    expect(await keys()).toHaveLength(1)
    await expect(pending(page)).toHaveCount(0)

    // Só o avanço do relógio falso dispara o abort e o retry (TSD-13 item 6).
    await expect(async () => {
      await page.clock.runFor(500)
      await expect(pending(page)).toBeVisible({ timeout: 100 })
    }).toPass()

    const sent = await keys()
    expect(sent.length).toBeGreaterThanOrEqual(2)
    expect(new Set(sent)).toEqual(new Set([created!.idempotencyKey]))
    const all = await orders(page)
    expect(all.map((o) => o.id)).toEqual([created!.id])

    // O cliente guardou o mesmo id: a liquidação dele leva ao recibo desse pedido.
    await page.evaluate((id) => window.__kurioMock?.settleOrder(id, 'confirmed'), created!.id)
    await expect(async () => {
      await page.clock.runFor(500)
      await expect(page).toHaveURL(new RegExp(`/pedido/${created!.id}`), { timeout: 100 })
    }).toPass()
  })

  test('(1) WALLET_DISCONNECTED bloqueia sem pedido; reconectar libera um único pedido', async ({
    page,
  }) => {
    await ready(page)
    const keys = await recordOrderKeys(page)
    const before = await connectedWalletId(page)
    expect(before).not.toBe('')
    await page.evaluate((id) => window.__kurioMock?.disconnectWallet(id), before)

    await confirm(page).click()

    await expect(connection(page)).toContainText('Desconectada')
    // O alerta só aparece com o 409 já recebido: o servidor recusou sem criar pedido.
    await expect(page.getByRole('alert').filter({ hasText: DISCONNECTED })).toBeVisible()
    expect(await keys()).toHaveLength(1)
    expect(await orders(page)).toEqual([])

    // Enquanto desconectada, insistir não envia nada (conferido pelas chaves no fim).
    await confirm(page).click()
    await expect(page.getByRole('alert').filter({ hasText: DISCONNECTED })).toBeVisible()
    await expect(connection(page)).toContainText('Desconectada')

    // Desconectada conta como falha de conexão: o botão de conectar vira "Tentar novamente".
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    await expect(connection(page)).toContainText('Conectada', { timeout: 15_000 })
    expect(await connectedWalletId(page)).not.toBe('')
    await confirm(page).click()

    await expect(pending(page)).toBeVisible()
    const all = await orders(page)
    expect(all).toHaveLength(1)
    // Só o 409 e o envio após reconectar: o clique bloqueado não gerou POST.
    expect(await keys()).toHaveLength(2)
    expect((await keys())[1]).toBe(all[0]!.idempotencyKey)
  })
})
