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

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
