import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../mutations', () => ({
  useUploadAvatar: () => ({ isPending: false, mutate: vi.fn() }),
  useRemoveAvatar: () => ({ isPending: false, mutate: vi.fn() }),
}))

import { AvatarField } from './avatar-field'

describe('AvatarField', () => {
  it('sem avatar: placeholder com alt, "Alterar" ativo e "Remover" desabilitado', () => {
    const html = renderToStaticMarkup(<AvatarField uid="u1" />)
    expect(html).toContain('aria-label="Avatar padrão"')
    expect(html).toContain('Alterar')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Remover/)
    expect(html).toContain('accept="image/png,image/jpeg,image/webp"')
  })

  it('com avatar: imagem com alt e "Remover" habilitado', () => {
    const html = renderToStaticMarkup(
      <AvatarField uid="u1" avatarUrl="data:image/webp;base64,AA" />,
    )
    expect(html).toContain('alt="Seu avatar"')
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Remover/)
  })

  it('regiões de erro e status presentes para anúncio', () => {
    const html = renderToStaticMarkup(<AvatarField uid="u1" />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('role="status"')
  })
})
