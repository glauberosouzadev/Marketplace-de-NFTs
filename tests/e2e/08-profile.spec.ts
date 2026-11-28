import { expect, test, type Locator, type Page } from '@playwright/test'
import { gotoApp, primaryWallet } from './support'

const ANA = { email: 'ana@kurio.test', password: 'Kurio@2026' }
const BRUNO = { email: 'bruno@kurio.test', username: 'bruno.criador' }
const NEW_PASSWORD = 'Nova#Senha2027'
const WRONG_PASSWORD = 'Errada#123'
const REQUIRED = 'Campo obrigatório'

// PNG 1x1 válido: o mock redimensiona via canvas e precisa decodificar a imagem.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const box = (page: Page, label: string): Locator =>
  page.getByRole('textbox', { name: new RegExp(`^${label}`) })
const password = (page: Page, label: string): Locator => page.getByLabel(label, { exact: true })
const save = (page: Page) => page.getByRole('button', { name: 'Salvar', exact: true })
const avatarInput = (page: Page) => page.locator('input[type="file"]')
const avatarAlert = (page: Page) => page.getByRole('alert').filter({ hasText: /avatar|imagem|MB/i })

async function expectFieldError(field: Locator, message: string): Promise<void> {
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(field).toHaveAccessibleDescription(new RegExp(message))
}

async function login(page: Page, email = ANA.email, pass = ANA.password): Promise<void> {
  await gotoApp(page, '/login')
  await page.getByPlaceholder('contato@email.com').fill(email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(pass)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function openProfile(page: Page): Promise<void> {
  await gotoApp(page, '/perfil')
  await expect(box(page, 'Nome de exibição')).toHaveValue('Ana Colecionadora')
}

test.describe('@main @responsive E2E-08 perfil, avatar e senha', () => {
  test('sem sessão vai a /login?redirect=/perfil', async ({ page }) => {
    await gotoApp(page, '/perfil')

    await expect(page).toHaveURL(/\/login\?.*redirect=%2Fperfil/)
  })

  test('formulário vem pré-preenchido e "Dados do perfil" tem aria-current', async ({ page }) => {
    await login(page)
    await openProfile(page)

    await expect(box(page, 'Nome de usuário')).toHaveValue('ana.colecionadora')
    await expect(box(page, 'E-mail')).toHaveValue(ANA.email)
    await expect(box(page, 'Nome ENS')).toHaveValue('ana')
    await expect(box(page, 'Apelido da carteira')).not.toHaveValue('')
    await expect(page.getByRole('link', { name: 'Dados do perfil' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('link', { name: 'Carteiras' })).not.toHaveAttribute('aria-current')
  })

  test('obrigatórios vazios e e-mail inválido mostram erro no campo e focam o primeiro', async ({
    page,
  }) => {
    await login(page)
    await openProfile(page)

    await box(page, 'Nome de exibição').fill('')
    await box(page, 'E-mail').fill('sem-arroba')
    await box(page, 'Nome ENS').fill('')
    await save(page).click()

    await expectFieldError(box(page, 'Nome de exibição'), REQUIRED)
    await expectFieldError(box(page, 'E-mail'), 'Digite um e-mail válido')
    await expectFieldError(box(page, 'Nome ENS'), REQUIRED)
    await expect(box(page, 'Nome de exibição')).toBeFocused()
  })

  test('e-mail e usuário de outra conta voltam 409 nos campos', async ({ page }) => {
    await login(page)
    await openProfile(page)

    await box(page, 'Nome de usuário').fill(BRUNO.username)
    await box(page, 'E-mail').fill(BRUNO.email)
    await save(page).click()

    await expectFieldError(box(page, 'Nome de usuário'), 'Este nome de usuário já está em uso')
    await expectFieldError(box(page, 'E-mail'), 'Este e-mail já está em uso')
    await expect(box(page, 'Nome de usuário')).toBeFocused()
  })

  test('salvar válido persiste após refresh e o apelido aparece em Carteiras', async ({ page }) => {
    await login(page)
    await openProfile(page)

    await box(page, 'Nome de exibição').fill('Ana Atualizada')
    await box(page, 'Apelido da carteira').fill('Cofre Principal')
    await save(page).click()
    await expect(page.getByRole('status').filter({ hasText: 'Perfil salvo.' })).toBeVisible()

    await page.reload()
    await expect(box(page, 'Nome de exibição')).toHaveValue('Ana Atualizada')
    await expect(box(page, 'Apelido da carteira')).toHaveValue('Cofre Principal')

    await gotoApp(page, '/carteiras')
    await expect(
      primaryWallet(page).getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
    ).toHaveValue('Cofre Principal')
  })

  test.describe('avatar', () => {
    test('tipo inválido e arquivo acima de 2 MB mostram erro e não alteram o avatar', async ({
      page,
    }) => {
      await login(page)
      await openProfile(page)

      await avatarInput(page).setInputFiles({
        name: 'nota.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('não sou imagem'),
      })
      await expect(avatarAlert(page)).toHaveText('Use uma imagem PNG, JPEG ou WebP')
      await expect(
        page.getByRole('button', { name: 'Alterar avatar' }),
      ).toHaveAccessibleDescription('Use uma imagem PNG, JPEG ou WebP')

      await avatarInput(page).setInputFiles({
        name: 'grande.png',
        mimeType: 'image/png',
        buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
      })
      await expect(avatarAlert(page)).toHaveText('A imagem deve ter no máximo 2 MB')
      await expect(page.getByRole('img', { name: 'Avatar padrão' })).toBeVisible()
    })

    test('válido mostra preview e persiste; remover volta ao placeholder e persiste', async ({
      page,
    }) => {
      await login(page)
      await openProfile(page)
      await expect(page.getByRole('img', { name: 'Avatar padrão' })).toBeVisible()

      await avatarInput(page).setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: PNG_1X1,
      })
      await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
      await expect(page.getByRole('status').filter({ hasText: 'Avatar atualizado.' })).toBeVisible()

      await page.reload()
      await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

      await page.getByRole('button', { name: 'Remover avatar' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Avatar removido.' })).toBeVisible()
      await expect(page.getByRole('img', { name: 'Avatar padrão' })).toBeVisible()

      await page.reload()
      await expect(page.getByRole('img', { name: 'Avatar padrão' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Remover avatar' })).toBeDisabled()
    })
  })

  test.describe('senha', () => {
    test('atual errada: erro no campo e dados do perfil já salvos', async ({ page }) => {
      await login(page)
      await openProfile(page)

      await box(page, 'Nome de exibição').fill('Ana Parcial')
      await password(page, 'Senha atual').fill(WRONG_PASSWORD)
      await password(page, 'Nova senha').fill(NEW_PASSWORD)
      await password(page, 'Confirmar nova senha').fill(NEW_PASSWORD)
      await save(page).click()

      await expectFieldError(password(page, 'Senha atual'), 'Senha atual incorreta')
      await expect(
        page.getByRole('alert').filter({ hasText: 'Dados do perfil salvos' }),
      ).toBeVisible()

      await page.reload()
      await expect(box(page, 'Nome de exibição')).toHaveValue('Ana Parcial')
    })

    test('nova igual à atual e confirmação diferente são barradas no campo', async ({ page }) => {
      await login(page)
      await openProfile(page)

      await password(page, 'Senha atual').fill(ANA.password)
      await password(page, 'Nova senha').fill(ANA.password)
      await password(page, 'Confirmar nova senha').fill(ANA.password)
      await save(page).click()
      await expectFieldError(
        password(page, 'Nova senha'),
        'A nova senha deve ser diferente da atual',
      )

      await password(page, 'Nova senha').fill(NEW_PASSWORD)
      await password(page, 'Confirmar nova senha').fill('Outra#Senha2027')
      await save(page).click()
      await expectFieldError(password(page, 'Confirmar nova senha'), 'As senhas não conferem')
    })

    test('sucesso permite login pela senha nova e a senha não fica em claro (RN-15)', async ({
      page,
    }) => {
      await login(page)
      await openProfile(page)

      await password(page, 'Senha atual').fill(ANA.password)
      await password(page, 'Nova senha').fill(NEW_PASSWORD)
      await password(page, 'Confirmar nova senha').fill(NEW_PASSWORD)
      await save(page).click()
      await expect(
        page.getByRole('status').filter({ hasText: 'Perfil e senha salvos.' }),
      ).toBeVisible()

      const stored = await page.evaluate(() =>
        Object.keys(localStorage)
          .concat(Object.keys(sessionStorage))
          .map((k) => `${k}=${localStorage.getItem(k) ?? sessionStorage.getItem(k) ?? ''}`)
          .join('\n'),
      )
      expect(stored).toContain('kurio-mock:')
      expect(stored).not.toContain(NEW_PASSWORD)
      expect(stored).not.toContain(ANA.password)

      // Sem "Sair" no cabeçalho mobile (FR-43): encerra a sessão removendo a chave.
      await page.evaluate(() => localStorage.removeItem('kurio:session'))
      await login(page, ANA.email, NEW_PASSWORD)
    })
  })

  test('"Sair" do menu do perfil encerra a sessão', async ({ page }) => {
    await login(page)
    await openProfile(page)

    await page.getByRole('button', { name: 'Sair' }).click()

    await expect(page).not.toHaveURL(/\/perfil/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kurio:session'))).toBeNull()
    await gotoApp(page, '/perfil')
    await expect(page).toHaveURL(/\/login\?.*redirect=%2Fperfil/)
  })
})
