import type { Page } from '@playwright/test'

interface GotoAppOptions {
  scenario?: string
}

export async function gotoApp(
  page: Pick<Page, 'goto'>,
  path: string,
  options: GotoAppOptions = {},
): Promise<void> {
  const params = new URLSearchParams()
  if (options.scenario) params.set('scenario', options.scenario)
  params.set('panel', '0')
  const separator = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${separator}${params}`)
}
