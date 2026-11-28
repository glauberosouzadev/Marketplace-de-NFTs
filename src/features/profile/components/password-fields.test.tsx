import { renderToStaticMarkup } from 'react-dom/server'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import type { ProfileFormValues } from '@/contracts/forms'
import { Form } from '@/ui/form'
import { PasswordFields } from './password-fields'

function Harness() {
  const form = useForm<ProfileFormValues>()
  return (
    <Form {...form}>
      <PasswordFields control={form.control} />
    </Form>
  )
}

describe('PasswordFields', () => {
  it('três campos de senha rotulados, com alternância de visibilidade', () => {
    const html = renderToStaticMarkup(<Harness />)
    expect(html).toContain('<legend')
    expect(html).toContain('Alterar senha')
    for (const label of ['Senha atual', 'Nova senha', 'Confirmar nova senha'])
      expect(html).toContain(`>${label}</label>`)
    expect(html.match(/type="password"/g)).toHaveLength(3)
    expect(html.match(/aria-label="Mostrar senha"/g)).toHaveLength(3)
    expect(html).toMatch(/autocomplete="current-password"/i)
  })
})
