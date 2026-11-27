import { expect, test, type Page, type Request } from '@playwright/test'
import { gotoApp } from './support'

const DESKTOP_MIN_WIDTH = 1024
const PAGE_SIZE = 12

const isDesktop = (page: Page): boolean => (page.viewportSize()?.width ?? 0) >= DESKTOP_MIN_WIDTH

const catalog = (page: Page) => page.getByRole('region', { name: 'Catálogo de NFTs' })
const cardNames = (page: Page) => catalog(page).getByRole('link').locator('h2')
/** Preço atual do card: primeiro "N ETH" depois do nome (o preço anterior riscado vem depois). */
const cardPrices = async (page: Page): Promise<string[]> =>
  catalog(page)
    .getByRole('link')
    .filter({ has: page.getByRole('heading') })
    .evaluateAll((links) =>
      links.map((a) => {
        const name = a.querySelector('h2')?.textContent ?? ''
        const rest = (a.textContent ?? '').replace(name, '')
        return /(\d+(?:\.\d+)?) ETH/.exec(rest)?.[0] ?? ''
      }),
    )
const search = (page: Page): URLSearchParams => new URL(page.url()).searchParams
/** Listas vão na URL como JSON (`network=["polygon"]`) ou como valor repetido. */
const listParam = (params: URLSearchParams, key: string): string[] =>
  params.getAll(key).flatMap((value) => {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : [value]
    } catch {
      return [value]
    }
  })
const updating = (page: Page) => catalog(page).getByRole('status')

/** Preço decimal ("1.19 ETH") em unidades de 1e-18, sem `number`/`parseFloat`. */
function toUnits(text: string): bigint {
  const [whole = '0', fraction = ''] = text
    .replace(/\s*ETH$/, '')
    .trim()
    .split('.')
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
}

async function prices(page: Page): Promise<bigint[]> {
  return (await cardPrices(page)).map(toUnits)
}

/** Registra as consultas `GET /nfts?...` (a listagem, não facetas nem destaques). */
function trackListRequests(page: Page): Request[] {
  const requests: Request[] = []
  page.on('request', (request) => {
    const { pathname } = new URL(request.url())
    if (request.method() === 'GET' && pathname.endsWith('/nfts')) requests.push(request)
  })
  return requests
}

async function openFilters(page: Page): Promise<void> {
  if (!isDesktop(page)) {
    await page.getByRole('button', { name: 'Filtros' }).click()
    await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeVisible()
  }
}

/** Escopo dos filtros: sidebar no desktop, drawer no mobile. */
const filtersScope = (page: Page) =>
  isDesktop(page)
    ? page.getByRole('complementary', { name: 'Filtros' })
    : page.getByRole('dialog', { name: 'Filtros' })

interface FilterChoice {
  collection?: string
  network?: string
  /** Quantas vezes pressionar PageUp no marcador de preço mínimo (+0,10 ETH cada). */
  minPageUps?: number
}

/** No desktop cada clique grava na URL; no mobile tudo vai de uma vez em "Aplicar filtros". */
async function chooseFilters(page: Page, choice: FilterChoice): Promise<void> {
  await openFilters(page)
  const scope = filtersScope(page)
  // Cada escolha refaz as facetas e remonta o painel: espera o esqueleto sumir antes do próximo passo.
  const settled = async () => expect(scope.getByLabel('Carregando filtros')).toHaveCount(0)
  await settled()
  // Preço primeiro: com coleção e rede já aplicadas as facetas podem estreitar o intervalo a um ponto só.
  if (choice.minPageUps) {
    const thumb = scope.getByRole('slider', { name: 'Preço mínimo' })
    await thumb.focus()
    for (let i = 0; i < choice.minPageUps; i += 1) await thumb.press('PageUp')
    if (isDesktop(page)) await scope.getByRole('button', { name: 'Aplicar', exact: true }).click()
  }
  if (choice.minPageUps) await settled()
  if (choice.collection) {
    await scope.getByRole('checkbox', { name: new RegExp(`^${choice.collection}`) }).click()
    await settled()
  }
  if (choice.network) {
    await scope.getByRole('checkbox', { name: new RegExp(`^${choice.network}`) }).click()
    await settled()
  }
  if (!isDesktop(page)) await page.getByRole('button', { name: 'Aplicar filtros' }).click()
}

async function searchFor(page: Page, term: string): Promise<void> {
  if (isDesktop(page)) {
    await page.getByRole('banner').getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('banner').getByRole('searchbox', { name: 'Buscar NFTs' }).fill(term)
    await page.getByRole('banner').getByRole('searchbox', { name: 'Buscar NFTs' }).press('Enter')
  } else {
    const field = page.getByPlaceholder('Explorar coleções')
    await field.fill(term)
    await field.press('Enter')
  }
}

const sortBox = (page: Page) => page.getByRole('combobox', { name: 'Ordenar por:' })

async function sortBy(page: Page, label: string): Promise<void> {
  await sortBox(page).click()
  await page.getByRole('option', { name: label }).click()
}

async function loadCatalog(page: Page, path = '/', scenario?: string): Promise<void> {
  await gotoApp(page, path, scenario ? { scenario } : {})
  await expect(cardNames(page).first()).toBeVisible()
}

test.describe('@main E2E-01 catálogo com estado na URL', () => {
  test('carga default mostra a primeira página, ordenada por recentes, sem filtros na URL', async ({
    page,
  }) => {
    await loadCatalog(page)

    await expect(cardNames(page)).toHaveCount(PAGE_SIZE)
    await expect(page.getByRole('tab', { name: 'Todos os NFTs' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(sortBox(page)).toHaveText('Listados recentemente')
    await expect(page.getByRole('button', { name: 'Página 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const params = search(page)
    expect(params.get('q')).toBeNull()
    expect(listParam(params, 'collection')).toEqual([])
    expect(listParam(params, 'network')).toEqual([])
    expect(params.get('priceMin')).toBeNull()
  })

  test('busca por termo vai para a URL e filtra o resultado', async ({ page }) => {
    await loadCatalog(page)

    await searchFor(page, 'Golden')

    await expect.poll(() => search(page).get('q')).toBe('Golden')
    await expect(cardNames(page).first()).toContainText('Golden')
    const names = await cardNames(page).allTextContents()
    expect(names.length).toBeGreaterThan(0)
    expect(names.length).toBeLessThan(PAGE_SIZE)
    for (const name of names) expect(name).toContain('Golden')
  })

  test('aba, coleção, rede e preço combinados geram uma consulta e voltam à página 1', async ({
    page,
  }) => {
    const requests = trackListRequests(page)
    await loadCatalog(page, '/?page=2')
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await page.getByRole('tab', { name: 'Novos lançamentos' }).click()
    await expect.poll(() => search(page).get('tab')).toBe('new')
    await expect(updating(page)).toHaveText('')
    await expect.poll(() => search(page).get('page') ?? '1').toBe('1')

    const before = requests.length
    await chooseFilters(page, { collection: 'Arte digital', network: 'Ethereum', minPageUps: 1 })

    await expect.poll(() => listParam(search(page), 'collection')).toEqual(['arte-digital'])
    expect(listParam(search(page), 'network')).toEqual(['ethereum'])
    expect(search(page).get('tab')).toBe('new')
    await expect.poll(() => search(page).get('priceMin')).not.toBeNull()
    expect(search(page).get('page') ?? '1').toBe('1')

    await expect(updating(page)).toHaveText('')
    const last = new URL(requests[requests.length - 1]!.url()).searchParams
    expect(listParam(last, 'collection')).toEqual(['arte-digital'])
    expect(listParam(last, 'network')).toEqual(['ethereum'])
    expect(last.get('tab')).toBe('new')
    expect(`"${last.get('priceMin')}"`).toBe(search(page).get('priceMin'))
    expect(last.get('page')).toBe('1')
    // No mobile o drawer aplica tudo de uma vez: exatamente uma consulta nova.
    if (!isDesktop(page)) expect(requests.length - before).toBe(1)
  })

  test('combinação vazia mostra "Nenhum NFT encontrado" e "Limpar filtros" restaura o catálogo', async ({
    page,
  }) => {
    await loadCatalog(page)

    await chooseFilters(page, { collection: 'Utilidade', network: 'Solana' })

    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await expect(cardNames(page)).toHaveCount(0)
    expect(listParam(search(page), 'collection')).toEqual(['utilidade'])
    expect(listParam(search(page), 'network')).toEqual(['solana'])

    await page.getByRole('button', { name: 'Limpar filtros' }).click()

    await expect(cardNames(page)).toHaveCount(PAGE_SIZE)
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toHaveCount(0)
    expect(listParam(search(page), 'collection')).toEqual([])
    expect(listParam(search(page), 'network')).toEqual([])
  })

  test('ordenação por preço crescente e decrescente segue a resposta; recentes volta à ordem original', async ({
    page,
  }) => {
    await loadCatalog(page)
    const recentNames = await cardNames(page).allTextContents()

    await sortBy(page, 'Preço crescente')
    await expect.poll(() => search(page).get('sort')).toBe('price_asc')
    await expect(sortBox(page)).toHaveText('Preço crescente')
    await expect(updating(page)).toHaveText('')
    const asc = await prices(page)
    expect(asc).toHaveLength(PAGE_SIZE)
    asc.slice(1).forEach((value, i) => expect(value >= asc[i]!).toBe(true))

    await sortBy(page, 'Preço decrescente')
    await expect.poll(() => search(page).get('sort')).toBe('price_desc')
    await expect(updating(page)).toHaveText('')
    const desc = await prices(page)
    expect(desc).toHaveLength(PAGE_SIZE)
    desc.slice(1).forEach((value, i) => expect(value <= desc[i]!).toBe(true))
    expect(desc[0]! > asc[0]!).toBe(true)

    await sortBy(page, 'Listados recentemente')
    await expect(sortBox(page)).toHaveText('Listados recentemente')
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(recentNames)
  })

  test('paginação leva às páginas 2 e 3 pela URL, com conteúdo diferente', async ({ page }) => {
    await loadCatalog(page)
    const first = await cardNames(page).allTextContents()

    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect.poll(() => search(page).get('page')).toBe('2')
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect.poll(async () => (await cardNames(page).allTextContents())[0]).not.toBe(first[0])
    const second = await cardNames(page).allTextContents()
    expect(second.filter((name) => first.includes(name))).toEqual([])

    await page.getByRole('button', { name: 'Página 3' }).click()
    await expect.poll(() => search(page).get('page')).toBe('3')
    await expect(page.getByRole('button', { name: 'Página 3' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect.poll(async () => (await cardNames(page).allTextContents())[0]).not.toBe(second[0])
    const third = await cardNames(page).allTextContents()
    expect(third.filter((name) => [...first, ...second].includes(name))).toEqual([])
  })

  test('voltar, avançar e recarregar restauram ordenação e página', async ({ page }) => {
    // Sem filtros o catálogo tem 3 páginas (SDD-11): a paginação sempre existe.
    await loadCatalog(page)
    const recentNames = await cardNames(page).allTextContents()

    await sortBy(page, 'Preço crescente')
    await expect.poll(() => search(page).get('sort')).toBe('price_asc')
    await expect(updating(page)).toHaveText('')
    await expect
      .poll(async () => (await cardNames(page).allTextContents())[0])
      .not.toBe(recentNames[0])
    const sortedNames = await cardNames(page).allTextContents()

    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect.poll(() => search(page).get('page')).toBe('2')
    await expect
      .poll(async () => (await cardNames(page).allTextContents())[0])
      .not.toBe(sortedNames[0])
    const pageTwoNames = await cardNames(page).allTextContents()

    await page.goBack()
    await expect.poll(() => search(page).get('page') ?? '1').toBe('1')
    expect(search(page).get('sort')).toBe('price_asc')
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(sortedNames)

    await page.goBack()
    await expect.poll(() => search(page).get('sort') ?? 'recent').toBe('recent')
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(recentNames)

    await page.goForward()
    await expect.poll(() => search(page).get('sort')).toBe('price_asc')
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(sortedNames)

    await page.goForward()
    await expect.poll(() => search(page).get('page')).toBe('2')
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(pageTwoNames)
    const url = page.url()

    await page.reload()

    expect(page.url()).toBe(url)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(pageTwoNames)
    expect(search(page).get('sort')).toBe('price_asc')
  })

  test('voltar e avançar restauram filtro de rede', async ({ page }) => {
    await loadCatalog(page)
    const allNames = await cardNames(page).allTextContents()
    await chooseFilters(page, { network: 'Polygon' })
    await expect.poll(() => listParam(search(page), 'network')).toEqual(['polygon'])
    await expect(updating(page)).toHaveText('')
    const filteredNames = await cardNames(page).allTextContents()
    expect(filteredNames.length).toBeGreaterThan(0)

    await page.goBack()
    await expect.poll(() => listParam(search(page), 'network')).toEqual([])
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(allNames)

    await page.goForward()
    await expect.poll(() => listParam(search(page), 'network')).toEqual(['polygon'])
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(filteredNames)

    await page.reload()
    expect(listParam(search(page), 'network')).toEqual(['polygon'])
    await expect.poll(async () => cardNames(page).allTextContents()).toEqual(filteredNames)
  })

  test('S-02: respostas fora de ordem não sobrescrevem a consulta vigente', async ({ page }) => {
    const requests = trackListRequests(page)
    await loadCatalog(page, '/', 'S-02')

    await sortBy(page, 'Preço crescente')
    await expect.poll(() => search(page).get('sort')).toBe('price_asc')
    await sortBy(page, 'Preço decrescente')
    await expect.poll(() => search(page).get('sort')).toBe('price_desc')
    // A partir daqui a consulta vigente está na URL: registra cada estado da lista exibido na UI.
    await page.evaluate(() => {
      const w = window as unknown as { __orders: string[][] }
      w.__orders = []
      const read = () =>
        Array.from(
          document.querySelectorAll('section[aria-label="Catálogo de NFTs"] a:has(h2)'),
          (a) =>
            /(\d+(?:\.\d+)?) ETH/.exec(
              (a.textContent ?? '').replace(a.querySelector('h2')?.textContent ?? '', ''),
            )?.[1] ?? '',
        )
      const record = () => w.__orders.push(read())
      record()
      new MutationObserver(record).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    })

    await expect(updating(page)).toHaveText('', { timeout: 15_000 })
    await expect(sortBox(page)).toHaveText('Preço decrescente')
    const desc = await prices(page)
    expect(desc).toHaveLength(PAGE_SIZE)
    desc.slice(1).forEach((value, i) => expect(value <= desc[i]!).toBe(true))

    // A consulta vigente é a última da fila e a UI nunca exibiu a ordem crescente da substituída.
    const sorts = requests.map((request) => new URL(request.url()).searchParams.get('sort'))
    expect(sorts.slice(-2)).toEqual(['price_asc', 'price_desc'])
    expect(await requests[requests.length - 1]!.failure()).toBeNull()
    const orders = await page.evaluate(
      () => (window as unknown as { __orders: string[][] }).__orders,
    )
    const showedAscending = orders.some((order) => {
      const units = order.filter(Boolean).map(toUnits)
      return (
        units.length > 1 &&
        units[0]! < units[units.length - 1]! &&
        units.slice(1).every((v, i) => v >= units[i]!)
      )
    })
    expect(showedAscending).toBe(false)
    // Estável: depois de assentar, a ordem continua a da consulta vigente.
    await expect.poll(async () => prices(page)).toEqual(desc)
  })
})
