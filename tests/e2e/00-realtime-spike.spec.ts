import { expect, test, type Page } from '@playwright/test'
import type { KurioEvent } from '@/contracts'
import { gotoApp } from './support'

declare global {
  interface Window {
    __spikeEvents?: KurioEvent[]
  }
}

const NFT_ID = 'nft-003'
const EDITION_ID = 'nft-003-ed-1'

async function openConnected(page: Page): Promise<void> {
  await gotoApp(page, '/')
  await expect.poll(() => page.evaluate(() => window.__kurioRealtime?.status())).toBe('connected')
  await page.evaluate(() => {
    window.__spikeEvents = []
    window.__kurioRealtime?.onEvent((event) => window.__spikeEvents?.push(event))
  })
}

const updatePrice = (page: Page, price: string): Promise<void> =>
  page.evaluate(
    ({ nftId, editionId, price }) => window.__kurioMock?.updateNft({ nftId, editionId, price }),
    { nftId: NFT_ID, editionId: EDITION_ID, price },
  )

const prices = (page: Page): Promise<Array<string | undefined>> =>
  page.evaluate(() =>
    (window.__spikeEvents ?? []).map((event) =>
      event.type === 'nft.updated' ? event.data.priceFrom : undefined,
    ),
  )

test('socket.io-client recebe nft.updated do MSW e reconecta após queda', async ({ page }) => {
  await openConnected(page)

  await updatePrice(page, '2.05')
  await expect.poll(() => prices(page)).toEqual(['2.05'])
  const [event] = await page.evaluate(() => window.__spikeEvents ?? [])
  expect(event).toMatchObject({
    type: 'nft.updated',
    audience: 'public',
    resource: { type: 'nft', id: NFT_ID },
    data: { priceFrom: '2.05', editions: expect.any(Array) },
  })
  expect(event?.id).toMatch(/^evt-\d{6}$/)
  expect(event?.version).toBeGreaterThan(1)
  expect(Number.isNaN(Date.parse(event?.occurredAt ?? ''))).toBe(false)

  await page.evaluate(() => window.__kurioMock?.dropRealtime())
  await expect
    .poll(() => page.evaluate(() => window.__kurioRealtime?.status()))
    .toBe('reconnecting')
  await page.evaluate(() => window.__kurioMock?.restoreRealtime())
  await expect.poll(() => page.evaluate(() => window.__kurioRealtime?.status())).toBe('connected')

  await updatePrice(page, '2.10')
  await expect.poll(() => prices(page)).toEqual(['2.05', '2.10'])
})

test('replayLastEvent reenvia o mesmo id e emitStale envia versão anterior', async ({ page }) => {
  await openConnected(page)
  await page.evaluate(({ nftId, editionId }) => window.__kurioMock?.soldOut(nftId, editionId), {
    nftId: NFT_ID,
    editionId: EDITION_ID,
  })
  await expect.poll(() => page.evaluate(() => window.__spikeEvents?.length)).toBe(1)

  await page.evaluate(() => window.__kurioMock?.replayLastEvent())
  await page.evaluate((id) => window.__kurioMock?.emitStale({ type: 'nft', id }), NFT_ID)
  await expect.poll(() => page.evaluate(() => window.__spikeEvents?.length)).toBe(3)

  const [original, replay, stale] = await page.evaluate(() => window.__spikeEvents ?? [])
  expect(original?.data).toMatchObject({
    editions: expect.arrayContaining([{ id: EDITION_ID, price: expect.any(String), available: 0 }]),
  })
  expect(replay?.id).toBe(original?.id)
  expect(stale?.id).not.toBe(original?.id)
  expect(stale?.version).toBe((original?.version ?? 0) - 1)
})
