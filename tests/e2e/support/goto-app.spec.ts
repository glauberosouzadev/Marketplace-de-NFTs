import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './index'

function fakePage(): { page: Pick<Page, 'goto'>; urls: string[] } {
  const urls: string[] = []
  const page = {
    goto: (url: string) => {
      urls.push(url)
      return Promise.resolve(null)
    },
  }
  return { page, urls }
}

test('gotoApp acrescenta scenario e panel=0', async () => {
  const { page, urls } = fakePage()
  await gotoApp(page, '/nft/1', { scenario: 'S-01' })
  expect(urls).toEqual(['/nft/1?scenario=S-01&panel=0'])
})

test('gotoApp sem cenário acrescenta só panel=0 e respeita query existente', async () => {
  const { page, urls } = fakePage()
  await gotoApp(page, '/')
  await gotoApp(page, '/?a=1', { scenario: 'S-02' })
  expect(urls).toEqual(['/?panel=0', '/?a=1&scenario=S-02&panel=0'])
})
