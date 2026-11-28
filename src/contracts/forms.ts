import { z } from 'zod'

/** Q-27: mínimo de 8 caracteres com letra e número. */
export const PASSWORD_POLICY_MESSAGE = 'Mínimo de 8 caracteres com letra e número'
const PASSWORD_POLICY = /^(?=.*\p{L})(?=.*\d).{8,}$/u

const email = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail')
  .pipe(z.email('Digite um e-mail válido'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha'),
})

export const registerSchema = z
  .object({
    username: z.string().trim().min(1, 'Informe um nome de usuário'),
    email,
    password: z.string().regex(PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((v) => !v.password || !v.confirmPassword || v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

const requiredText = z.string().trim().min(1, 'Campo obrigatório')

export const PROFILE_PASSWORD_FIELDS = [
  'currentPassword',
  'newPassword',
  'confirmPassword',
] as const
const isPasswordIssue = (path: readonly PropertyKey[] = []) =>
  (PROFILE_PASSWORD_FIELDS as readonly PropertyKey[]).includes(path[0] as PropertyKey)

/**
 * `ensName` guarda só o nome antes de `.eth` (o sufixo é fixo no formulário).
 * Senha é opcional, mas preencher qualquer campo dela exige os três (FR-51).
 */
export const profileSchema = z
  .object({
    displayName: requiredText,
    username: requiredText,
    email: requiredText.pipe(z.email('Digite um e-mail válido')),
    ensName: requiredText,
    walletNickname: requiredText,
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine(
    ({ currentPassword, newPassword, confirmPassword }, ctx) => {
      if (!currentPassword && !newPassword && !confirmPassword) return
      const fail = (field: (typeof PROFILE_PASSWORD_FIELDS)[number], message: string) =>
        ctx.addIssue({ code: 'custom', path: [field], message })
      if (!currentPassword) fail('currentPassword', 'Informe a senha atual')
      if (!newPassword) fail('newPassword', 'Informe a nova senha')
      else if (!PASSWORD_POLICY.test(newPassword)) fail('newPassword', PASSWORD_POLICY_MESSAGE)
      else if (newPassword === currentPassword)
        fail('newPassword', 'A nova senha deve ser diferente da atual')
      if (!confirmPassword) fail('confirmPassword', 'Confirme a nova senha')
      else if (newPassword && confirmPassword !== newPassword)
        fail('confirmPassword', 'As senhas não conferem')
    },
    // Sem `when`, um erro nos dados do perfil poderia pular esta regra; o "Salvar" valida tudo de uma vez.
    { when: ({ issues }) => !issues.some((issue) => isPasswordIssue(issue.path)) },
  )

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ProfileFormValues = z.input<typeof profileSchema>
