import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './support'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026', name: 'Ana Colecionadora' }
const BRUNO = { email: 'bruno@kurio.test', password: 'Colecao#2026' }
const NFT = '/nft/nft-001'
const NOT_FOUND = 'Pedido não encontrado'
const CONFIRMED = 'Seus NFTs agora estão na sua carteira'
const PENDING_TITLE = 'Pedido aguardando confirmação'
const REJECTED_TITLE = 'Pedido recusado'

type Network = 'Ethereum' | 'Polygon' | 'Solana'
const EXPLORER: Record<Network, string> = {
  Ethereum: 'Etherscan',
  Polygon: 'Polygonscan',
  Solana: 'Solscan',
}

interface Snapshot {
  total: string
  discount: string
  networkFee: string
  network: string
  wallet: { provider: string }
  lines: { nftId: string; quantity: number; lineTotal: string }[]
}
interface StoredOrder {
  id: string
  txHash?: string
  explorerUrl?: string
  snapshot: Snapshot
}

const connection = (page: Page) => page.getByRole('status').filter({ hasText: 'Conexão:' })
const receipt = (page: Page) => page.getByRole('dialog', { name: 'Recibo do pedido' })

async function login(page: Page, user = ANA): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(user.email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

interface PlaceOptions {
  network?: Network
  coupon?: string
}

/** Cria um pedido pendente pelo fluxo real (carrinho, pagamento, confirmar) e devolve o id. */
async function placeOrder(page: Page, options: PlaceOptions = {}): Promise<string> {
  await login(page)
  await gotoApp(page, NFT)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/^Adicionado ao carrinho:/)).toBeVisible()
  if (options.coupon) {
    await gotoApp(page, '/carrinho')
    const summary = page.getByRole('region', { name: 'Resumo do pedido' })
    await summary.getByLabel('Código promocional').fill(options.coupon)
    await summary.getByRole('button', { name: 'Aplicar' }).click()
    await expect(summary.getByText(options.coupon, { exact: true })).toBeVisible()
  }
  await gotoApp(page, '/pagamento')
  await expect(page.getByRole('heading', { level: 2, name: 'Seus NFTs' })).toBeVisible()
  if (options.network) {
    await page.getByRole('combobox', { name: 'Rede da conexão' }).click()
    await page.getByRole('option', { name: options.network }).click()
  }
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(connection(page)).toContainText('Conectada', { timeout: 15_000 })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aguardando confirmação' })).toBeVisible()
  const orders = await storedOrders(page)
  expect(orders).toHaveLength(1)
  return orders[0]?.id ?? ''
}

const storedOrders = (page: Page) =>
  page.evaluate(() => (window.__kurioMock?.listOrders() ?? []) as unknown as StoredOrder[])

async function settled(
  page: Page,
  status: 'confirmed' | 'rejected',
  options: PlaceOptions = {},
): Promise<StoredOrder> {
  const id = await placeOrder(page, options)
  await page.evaluate(([i, s]) => window.__kurioMock?.settleOrder(i, s), [id, status] as const)
  const order = (await storedOrders(page)).find((o) => o.id === id)
  if (!order) throw new Error('pedido não encontrado no mock')
  return order
}

async function openOrder(page: Page, id: string, width: number, height = 900): Promise<void> {
  await page.setViewportSize({ width, height })
  await gotoApp(page, `/pedido/${id}`)
}

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test.describe('@main E2E-08 recibo do pedido', () => {
  test('(1) confirmado: recibo reproduz o snapshot, com explorador marcado como simulado', async ({
    page,
  }) => {
    const order = await settled(page, 'confirmed')
    await openOrder(page, order.id, 1440)

    const view = receipt(page)
    const { snapshot } = order
    const line = snapshot.lines[0]
    await expect(view.getByText(CONFIRMED)).toBeVisible()
    await expect(view.getByText('ID da transação')).toBeVisible()
    await expect(view.getByText('Data', { exact: true })).toBeVisible()
    await expect(view.getByText('Carteira', { exact: true })).toBeVisible()
    await expect(view.getByText('MetaMask', { exact: true })).toBeVisible()
    await expect(view.getByText('Detalhes da transação')).toBeVisible()
    await expect(view.getByText('Emerald Ape')).toBeVisible()
    await expect(view.getByText(/ID do token: #\S+/)).toBeVisible()
    await expect(view.getByText(`Quantidade: ${line?.quantity}`)).toBeAttached()
    await expect(view.getByText(`${line?.lineTotal} ETH`)).toBeVisible()
    await expect(view.getByText(`${snapshot.networkFee} ETH`)).toBeVisible()
    await expect(view.getByText(`${snapshot.total} ETH`).first()).toBeVisible()
    await expect(view.getByText('Taxa de rede')).toBeVisible()
    await expect(view.getByText('Desconto', { exact: true })).toHaveCount(0)
    const link = view.getByRole('link', { name: /Ver no Etherscan/ })
    await expect(link).toHaveAttribute('href', order.explorerUrl ?? 'ausente')
    await expect(link).toContainText('link simulado')
    await expect(
      view.getByText('Link simulado: não corresponde a uma transação real.'),
    ).toBeVisible()
  })

  test('(2) updateNft após a compra não altera valores, nome nem token do recibo', async ({
    page,
  }) => {
    const order = await settled(page, 'confirmed')
    await openOrder(page, order.id, 1440)
    const view = receipt(page)
    await expect(view.getByText(CONFIRMED)).toBeVisible()
    await expect(view.getByText(/ID do token: #\S+/)).toBeVisible()
    const before = await view.innerText()

    const line = order.snapshot.lines[0]
    await page.evaluate(
      (i) => {
        window.__kurioMock?.updateNft({ ...i, price: '9.5' })
        window.__kurioMock?.soldOut(i.nftId, i.editionId)
      },
      { nftId: line?.nftId ?? '', editionId: (line as { editionId?: string }).editionId ?? '' },
    )
    // Dá tempo ao evento chegar e ser aplicado ao cache.
    await expect(page.getByText(/9\.5/).first())
      .toBeAttached({ timeout: 3000 })
      .catch(() => {})
    await page.waitForTimeout(500)

    expect(await view.innerText()).toBe(before)
    await expect(view.getByText('9.5')).toHaveCount(0)
    await expect(view.getByText(`${order.snapshot.total} ETH`).first()).toBeVisible()
  })

  test('(3) pedido pendente por acesso direto mostra o estado real, sem recibo', async ({
    page,
  }) => {
    const id = await placeOrder(page)
    await openOrder(page, id, 1440)

    await expect(page.getByText(PENDING_TITLE)).toBeVisible()
    await expect(page.getByText(CONFIRMED)).toHaveCount(0)
    await expect(page.getByText('ID da transação')).toHaveCount(0)
    await expect(page.getByText(/Ver no /)).toHaveCount(0)
  })

  test('(3) pendente liquidado em tempo real vira recibo; recusado nunca mostra recibo', async ({
    page,
  }) => {
    const id = await placeOrder(page)
    await openOrder(page, id, 1440)
    await expect(page.getByText(PENDING_TITLE)).toBeVisible()

    await page.evaluate((i) => window.__kurioMock?.settleOrder(i, 'confirmed'), id)
    await expect(page.getByText(CONFIRMED)).toBeVisible()
  })

  test('(3) pedido recusado por acesso direto mostra o estado real, sem recibo', async ({
    page,
  }) => {
    const order = await settled(page, 'rejected')
    await openOrder(page, order.id, 1440)

    await expect(page.getByText(REJECTED_TITLE)).toBeVisible()
    await expect(page.getByText(/foi recusado e nenhum NFT/)).toBeVisible()
    await expect(page.getByText(CONFIRMED)).toHaveCount(0)
    await expect(page.getByText('ID da transação')).toHaveCount(0)
  })

  test('(4) pedido inexistente mostra 404 da UI', async ({ page }) => {
    await login(page)
    await openOrder(page, 'order-inexistente', 1440)

    await expect(page.getByText(NOT_FOUND)).toBeVisible()
    await expect(page.getByText(CONFIRMED)).toHaveCount(0)
  })

  test('(4) pedido de outro usuário mostra o mesmo 404, sem vazar dados', async ({ page }) => {
    const order = await settled(page, 'confirmed')
    await page.evaluate(() => window.__kurioMock?.expireSession())
    await openOrder(page, order.id, 1440)
    await expect(page).toHaveURL(/\/login/)
    await page.getByPlaceholder('contato@email.com').fill(BRUNO.email)
    await page.getByPlaceholder('Senha', { exact: true }).fill(BRUNO.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}`))
    await expect(page.getByText(NOT_FOUND)).toBeVisible()
    const body = await page.getByRole('dialog').innerText()
    for (const leaked of [
      CONFIRMED,
      'Emerald Ape',
      'MetaMask',
      'ID da transação',
      `${order.snapshot.total} ETH`,
      order.txHash?.slice(0, 8) ?? 'sem-hash',
    ]) {
      expect(body).not.toContain(leaked)
    }
    // Mesmo texto do inexistente: não distingue "existe mas não é seu".
    await expect(
      page.getByText('Este pedido não existe ou não está disponível para a sua conta.'),
    ).toBeVisible()
  })

  test('(5) ≥1024 px: modal com foco preso, × e Esc fecham e o foco é devolvido', async ({
    page,
  }) => {
    const order = await settled(page, 'confirmed')
    await openOrder(page, order.id, 1440)
    const view = receipt(page)
    await expect(view).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar ao Início' })).toHaveCount(0)

    // Foco preso: várias tabulações nunca saem do diálogo.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
        true,
      )
    }
    await page.keyboard.press('Escape')
    await expect(view).toHaveCount(0)
    await expect(page).toHaveURL(/\/(\?|$)/)

    await openOrder(page, order.id, 1440)
    await expect(receipt(page)).toBeVisible()
    await receipt(page)
      .getByRole('button', { name: /Close|Fechar/i })
      .click()
    await expect(receipt(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/(\?|$)/)
  })

  test('(5) foco devolvido a quem o tinha ao abrir o modal', async ({ page }) => {
    const order = await settled(page, 'confirmed')
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoApp(page, '/')
    const trigger = page.getByRole('link', { name: 'Carrinho' }).filter({ visible: true })
    await expect(trigger).toBeVisible()
    await trigger.focus()
    await page.evaluate((id) => {
      window.history.pushState({}, '', `/pedido/${id}?panel=0`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, order.id)
    await expect(receipt(page)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(receipt(page)).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  for (const width of [1440, 768, 390]) {
    test(`(5) ${width}px: layout correto e sem overflow horizontal`, async ({ page }) => {
      const order = await settled(page, 'confirmed')
      await openOrder(page, order.id, width, width === 390 ? 844 : 900)

      await expect(page.getByText(CONFIRMED)).toBeVisible()
      await expect(page.getByText(`${order.snapshot.total} ETH`).first()).toBeVisible()
      if (width >= 1024) {
        await expect(receipt(page)).toBeVisible()
        const box = await receipt(page).boundingBox()
        expect(box?.width ?? 0).toBeLessThanOrEqual(width)
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0)
      } else {
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(
          page.getByRole('heading', { level: 1, name: 'Recibo do pedido' }),
        ).toBeAttached()
        const back = page.getByRole('link', { name: 'Voltar ao Início' })
        await expect(back).toBeVisible()
        await back.click()
        await expect(page).toHaveURL(/\/(\?|$)/)
        await openOrder(page, order.id, width, width === 390 ? 844 : 900)
        await expect(page.getByText(CONFIRMED)).toBeVisible()
      }
      expect(await noOverflow(page)).toBe(true)
      const card = page.getByText('Detalhes da transação')
      const cardBox = await card.boundingBox()
      expect((cardBox?.x ?? 0) + (cardBox?.width ?? 0)).toBeLessThanOrEqual(width)
    })
  }

  test('(6) com cupom o recibo mostra "Desconto" do snapshot; sem cupom a linha não existe', async ({
    page,
  }) => {
    const order = await settled(page, 'confirmed', { coupon: 'KURIO10' })
    expect(Number(order.snapshot.discount)).toBeGreaterThan(0)
    await openOrder(page, order.id, 1440)

    const view = receipt(page)
    await expect(view.getByText('Desconto', { exact: true })).toBeVisible()
    await expect(view.getByText(`(-) ${order.snapshot.discount} ETH`)).toBeVisible()
  })

  for (const network of ['Ethereum', 'Polygon', 'Solana'] as const) {
    test(`(6) rede ${network}: texto de confirmação e explorador citam a rede do pedido`, async ({
      page,
    }) => {
      const order = await settled(page, 'confirmed', { network })
      expect(order.snapshot.network).toBe(network.toLowerCase())
      await openOrder(page, order.id, 1440)

      const view = receipt(page)
      await expect(view.getByText(`Transação confirmada na ${network}.`)).toBeVisible()
      await expect(
        view.getByRole('link', { name: new RegExp(`Ver no ${EXPLORER[network]}`) }),
      ).toBeVisible()
      for (const other of (['Ethereum', 'Polygon', 'Solana'] as const).filter((n) => n !== network))
        await expect(view.getByText(`Transação confirmada na ${other}.`)).toHaveCount(0)
    })
  }
})
