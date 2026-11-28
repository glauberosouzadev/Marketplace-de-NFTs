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

/** Formulário da carteira principal em /carteiras (a página também renderiza a carteira secundária). */
export function primaryWallet(page: Pick<Page, 'getByRole'>) {
  return page.getByRole('region', { name: 'Carteira principal' })
}

/** Formulário da carteira secundária em /carteiras. */
export function secondaryWallet(page: Pick<Page, 'getByRole'>) {
  return page.getByRole('region', { name: 'Carteira secundária' })
}
