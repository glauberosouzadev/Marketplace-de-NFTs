import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { registerSchema, type RegisterValues } from '@/contracts/forms'
import { Button } from '@/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form'
import { Input } from '@/ui/input'
import { applyApiError } from '../form-errors'
import { useRegister } from '../mutations'
import { PasswordInput } from './password-input'

interface AuthFormRegisterProps {
  submitLabel: string
  onSuccess: () => void
}

const SERVER_FIELDS = ['username', 'email', 'password'] as const

export function AuthFormRegister({ submitLabel, onSuccess }: AuthFormRegisterProps) {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { mutate, isPending } = useRegister()
  const [formError, setFormError] = useState<string | null>(null)

  const submit = form.handleSubmit(({ username, email, password }) => {
    setFormError(null)
    mutate(
      { username, email, password },
      {
        onSuccess,
        onError: (error) => setFormError(applyApiError(form, error, SERVER_FIELDS)),
      },
    )
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="grid gap-3">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Nome de usuário</FormLabel>
              <FormControl>
                <Input autoComplete="username" placeholder="Nome de usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Senha</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="Senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Confirmar senha</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Confirmar senha"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p role="alert" className="text-destructive text-center text-sm empty:hidden">
          {formError}
        </p>
        <Button type="submit" disabled={isPending} className="mt-3 w-full rounded-xl lg:rounded-md">
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
