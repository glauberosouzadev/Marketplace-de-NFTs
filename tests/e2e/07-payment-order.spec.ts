import { expect, test, type Page } from '@playwright/test'
import {
  connectedWalletId,
  connectionStatus as connection,
  dismissNotices,
  firstCartItem as cartItem,
  listOrders as orders,
  readyToConfirm as ready,
  recordOrderKeys,
} from './support/checkout'

const PENDING = 'Aguardando confirmação do pagamento…'
const REJECTED = 'Pagamento recusado. Seus itens continuam no carrinho.'
const STALE = 'Os valores mudaram. Revise e confirme novamente.'
const DISCONNECTED = 'A carteira foi desconectada. Conecte-a novamente para confirmar a compra.'

const confirm = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const pending = (page: Page) => page.getByRole('status').filter({ hasText: PENDING })

test.describe('@main E2E-07 pagamento: revisão, envio e estados do pedido', () => {
  test('(1) revisão mostra itens, cupom, taxa, total, carteira e rede idênticos à Quote', async ({
    page,
  }) => {
    await ready(page)

    const quote = await page.evaluate(async () => {
      const db = Object.fromEntries(
        ['carts', 'nfts'].map((k) => [
          k,
          JSON.parse(localStorage.getItem(`kurio-mock:${k}`) ?? '[]'),
        ]),
      )
      return db
    })
    const item = (quote.carts as { items: { nftId: string; quantity: number }[] }[]).flatMap(
      (c) => c.items,
    )[0]
    const summary = page.getByRole('region', { name: 'Seus NFTs' })
    await expect(
      summary.getByRole('list', { name: 'Itens do pedido' }).getByRole('listitem'),
    ).toHaveCount(1)
    await expect(summary.getByText(`(x ${item?.quantity})`)).toBeAttached()
    await expect(summary.getByText(/ID do token: #/)).toBeVisible()
    for (const label of ['Subtotal', 'Desconto do lançamento', 'Taxa de rede', 'Total']) {
      await expect(summary.getByText(label, { exact: true }).first()).toBeVisible()
    }
    await expect(summary.getByText('Taxa estimada')).toBeVisible()
    // Valores vêm da cotação: o total exibido é o mesmo do resumo, sem soma no cliente.
    const total = summary.locator('dd', { hasText: / ETH$/ }).last()
    await expect(total).toHaveText(/^\d+(\.\d+)? ETH$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Carteira conectada' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /^Rede\*?$/ })).toContainText('Ethereum')
    await expect(summary.getByRole('alert')).toHaveCount(0)
    expect(await orders(page)).toHaveLength(0)
  })

  test('(2) updateNft durante a revisão bloqueia a compra, mostra o diff e exige nova revisão', async ({
    page,
  }) => {
    await ready(page)
    const { nftId, editionId } = await cartItem(page)

    await page.evaluate((i) => window.__kurioMock?.updateNft({ ...i, price: '9.5' }), {
      nftId,
      editionId,
    })

    const diff = page.getByRole('alert').filter({ hasText: STALE })
    await expect(diff).toBeVisible()
    await expect(page.getByRole('list', { name: 'Valores alterados' })).toContainText('→')
    await expect(confirm(page)).toBeDisabled()
    expect(await orders(page)).toHaveLength(0)

    await dismissNotices(page)
    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(diff).toHaveCount(0)
    await expect(confirm(page)).toBeEnabled()
    expect(await orders(page)).toHaveLength(0)

    await confirm(page).click()
    await expect(pending(page)).toBeVisible()
    expect(await orders(page)).toHaveLength(1)
  })

  test('(2) o aviso em tempo real não cobre "Confirmar compra"', async ({ page }) => {
    await ready(page)
    const { nftId, editionId } = await cartItem(page)

    await page.evaluate((i) => window.__kurioMock?.updateNft({ ...i, price: '9.5' }), {
      nftId,
      editionId,
    })
    await expect(page.getByRole('button', { name: 'Dispensar aviso' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(confirm(page)).toBeFocused()

    // Com o aviso ainda na tela, o CTA recebe o clique na hora (sem esperar a auto-dispensa).
    await expect(page.getByRole('button', { name: 'Dispensar aviso' }).first()).toBeVisible()
    await confirm(page).click({ trial: true, timeout: 1000 })
  })

  test('(4) o aviso assertive de recusa não cobre "Tentar novamente"', async ({ page }) => {
    await ready(page)
    await confirm(page).click()
    await expect(pending(page)).toBeVisible()
    const [first] = await orders(page)

    await page.evaluate((id) => window.__kurioMock?.settleOrder(id, 'rejected'), first?.id ?? '')

    await expect(page.getByRole('alert').filter({ hasText: 'Pedido recusado.' })).toBeVisible()
    await page
      .getByRole('button', { name: 'Tentar novamente' })
      .click({ trial: true, timeout: 1000 })
  })

  test('(2) soldOut durante a revisão bloqueia a compra e nenhum pedido é criado', async ({
    page,
  }) => {
    await ready(page)
    const { nftId, editionId } = await cartItem(page)

    await page.evaluate(({ n, e }) => window.__kurioMock?.soldOut(n, e), {
      n: nftId,
      e: editionId,
    })

    await expect(page.getByRole('alert').filter({ hasText: STALE })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Valores alterados' })).toContainText(/Esgotado/)
    await expect(confirm(page)).toBeDisabled()
    expect(await orders(page)).toHaveLength(0)
  })

  test('(3) duplo clique cria um único pedido', async ({ page }) => {
    await ready(page)

    await confirm(page).dblclick()

    await expect(pending(page)).toBeVisible()
    expect(await orders(page)).toHaveLength(1)
    await expect(confirm(page)).toBeDisabled()
  })

  test('(3) S-08: timeout reenvia a mesma chave e termina com um pedido', async ({ page }) => {
    test.setTimeout(60_000)
    await ready(page, 'S-08')
    const recorded = await recordOrderKeys(page)

    await confirm(page).click()

    await expect(pending(page)).toBeVisible({ timeout: 40_000 })
    const keys = await recorded()
    expect(keys.length).toBeGreaterThanOrEqual(2)
    expect(new Set(keys).size).toBe(1)
    const all = await orders(page)
    expect(all).toHaveLength(1)
    expect(all[0]?.idempotencyKey).toBe(keys[0])
  })

  test('(4) pendente mostra "aguardando confirmação"', async ({ page }) => {
    await ready(page)

    await confirm(page).click()

    await expect(pending(page)).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento/)
  })

  test('(4) recusado mostra a mensagem, preserva itens e "Tentar novamente" gera nova chave', async ({
    page,
  }) => {
    await ready(page)
    await confirm(page).click()
    await expect(pending(page)).toBeVisible()
    const [first] = await orders(page)

    await page.evaluate((id) => window.__kurioMock?.settleOrder(id, 'rejected'), first?.id ?? '')

    await expect(page.getByRole('status').filter({ hasText: REJECTED })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Seus NFTs' }).getByRole('listitem')).toHaveCount(
      1,
    )
    expect(
      await page.evaluate(() => window.__kurioMock?.listCarts().flatMap((c) => c.items).length),
    ).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(pending(page)).toBeVisible()
    await expect(page.locator(':focus')).toContainText(PENDING)
    const all = await orders(page)
    expect(all).toHaveLength(2)
    expect(all[1]?.idempotencyKey).not.toBe(first?.idempotencyKey)
  })

  test('(4) confirmado dispara a navegação para /pedido/<id> (404 esperado até a 0048)', async ({
    page,
  }) => {
    await ready(page)
    await confirm(page).click()
    await expect(pending(page)).toBeVisible()
    const [order] = await orders(page)

    await page.evaluate((id) => window.__kurioMock?.settleOrder(id, 'confirmed'), order?.id ?? '')

    await expect(page).toHaveURL(new RegExp(`/pedido/${order?.id}`))
  })

  test('(5) refresh com pedido pendente recupera o estado sem novo pedido', async ({ page }) => {
    await ready(page)
    await confirm(page).click()
    await expect(pending(page)).toBeVisible()

    await page.reload()

    await expect(pending(page)).toBeVisible()
    expect(await orders(page)).toHaveLength(1)
  })

  test('(6) 409 QUOTE_STALE interrompe o envio, mostra o diff e não cria pedido', async ({
    page,
  }) => {
    await ready(page)
    const { nftId, editionId } = await cartItem(page)
    // Muda o preço no instante do POST /orders: a revalidação já passou, só o servidor percebe.
    await page.evaluate(
      (i) => {
        const open = XMLHttpRequest.prototype.open
        const send = XMLHttpRequest.prototype.send
        const urls = new WeakMap<XMLHttpRequest, string>()
        XMLHttpRequest.prototype.open = function (
          this: XMLHttpRequest,
          method: string,
          url: string | URL,
          ...rest: unknown[]
        ) {
          urls.set(this, `${method} ${String(url)}`)
          return (open as (...a: unknown[]) => void).call(this, method, url, ...rest)
        } as typeof open
        XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body) {
          if (/^POST .*\/orders$/.test(urls.get(this) ?? ''))
            window.__kurioMock?.updateNft({ ...i, price: '9.5' })
          return send.call(this, body)
        }
      },
      { nftId, editionId },
    )

    await confirm(page).click()

    await expect(page.getByRole('alert').filter({ hasText: STALE }).first()).toBeVisible()
    await expect(confirm(page)).toBeDisabled()
    expect(await orders(page)).toHaveLength(0)
  })

  test('(6) WALLET_DISCONNECTED: desconectada, bloqueio e nenhum pedido', async ({ page }) => {
    await ready(page)
    const connectionId = await connectedWalletId(page)
    expect(connectionId).not.toBe('')
    await page.evaluate((id) => window.__kurioMock?.disconnectWallet(id), connectionId)

    await confirm(page).click()

    await expect(connection(page)).toContainText('Desconectada')
    await expect(page.getByRole('alert').filter({ hasText: DISCONNECTED })).toBeVisible()
    expect(await orders(page)).toHaveLength(0)
  })
})
