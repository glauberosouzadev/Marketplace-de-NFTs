import { expect, type Page } from '@playwright/test'
import type { Order } from '@/contracts'
import { gotoApp } from './index'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }

export const connectionStatus = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Conexão:' })

/** Ana logada, `nft-001` no carrinho e carteira conectada em `/pagamento`. */
export async function readyToConfirm(page: Page, scenario?: string): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(ANA.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(ANA.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)

  await gotoApp(page, '/nft/nft-001', scenario ? { scenario } : {})
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
  await gotoApp(page, '/pagamento')
  await expect(page.getByRole('heading', { level: 2, name: 'Seus NFTs' })).toBeVisible()
  await expect(page.getByText('Subtotal').last()).toBeVisible()

  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(connectionStatus(page)).toContainText('Conectada', { timeout: 15_000 })
}

/** Registra a `Idempotency-Key` de cada `POST /orders` que sai do navegador. */
export async function recordOrderKeys(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const keys: string[] = []
    Object.assign(window, { __orderKeys: keys })
    const open = XMLHttpRequest.prototype.open
    const setHeader = XMLHttpRequest.prototype.setRequestHeader
    const posts = new WeakSet<XMLHttpRequest>()
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      if (method === 'POST' && /\/orders$/.test(String(url))) posts.add(this)
      return (open as (...a: unknown[]) => void).call(this, method, url, ...rest)
    } as typeof open
    XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, name, value) {
      if (posts.has(this) && name.toLowerCase() === 'idempotency-key') keys.push(value)
      return setHeader.call(this, name, value)
    }
  })
  return () => page.evaluate(() => (window as unknown as { __orderKeys: string[] }).__orderKeys)
}

/**
 * A API de controle não expõe as conexões; o id sai do armazenamento do mock (mesmo banco
 * que `disconnectWallet` altera).
 */
export const connectedWalletId = (page: Page) =>
  page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kurio-mock:walletConnections') ?? '[]') as {
      id: string
      status: string
    }[]
    return list.find((c) => c.status === 'connected')?.id ?? ''
  })

/** Pedidos gravados no banco simulado (fonte da verdade, não o cache do Query). */
export const listOrders = (page: Page) =>
  page.evaluate(() => (window.__kurioMock?.listOrders() ?? []) as Order[])

export interface CartItemRef {
  nftId: string
  editionId: string
  name: string
  unitPrice: string
}

/** Primeiro item do carrinho no banco simulado. */
export async function firstCartItem(page: Page): Promise<CartItemRef> {
  return page.evaluate(() => {
    const item = window.__kurioMock?.listCarts().flatMap((c) => c.items)[0]
    if (!item) throw new Error('carrinho vazio')
    const { nftId, editionId, name, unitPrice } = item
    return { nftId, editionId, name, unitPrice }
  })
}

export async function dismissNotices(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: 'Dispensar aviso' })
  while ((await close.count()) > 0) await close.first().click()
}
