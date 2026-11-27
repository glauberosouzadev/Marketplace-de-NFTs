import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { loginSchema, type LoginValues } from '@/contracts/forms'
import { errorMessage } from '@/http/error-messages'
import { Button } from '@/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form'
import { Input } from '@/ui/input'
import { applyApiError } from '../form-errors'
import { useLogin } from '../mutations'
import { PasswordInput } from './password-input'
import { UnavailableButton } from './social-buttons'

interface AuthFormLoginProps {
  /** Presente quando a sessão expirou: id do aviso, para o modal o incluir na descrição. */
  expiredId: string | undefined
  onSuccess: () => void
}

export function AuthFormLogin({ expiredId, onSuccess }: AuthFormLoginProps) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { mutate, isPending } = useLogin()
  const [formError, setFormError] = useState<string | null>(null)

  const submit = form.handleSubmit((values) => {
    setFormError(null)
    mutate(values, {
      onSuccess,
      // Credencial inválida é genérica: não revela qual campo falhou (FR-40).
      onError: (error) => setFormError(applyApiError(form, error, [])),
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="grid gap-3">
        {expiredId && (
          <p id={expiredId} role="status" className="text-warning text-center text-sm">
            {errorMessage('SESSION_EXPIRED')}
          </p>
        )}
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
                  placeholder="contato@email.com"
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
                <PasswordInput autoComplete="current-password" placeholder="Senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <UnavailableButton
          feature="Recuperação de senha"
          className="text-price focus-visible:ring-ring -mt-1 justify-self-end rounded-sm text-sm outline-none focus-visible:ring-2"
        >
          Esqueceu a senha?
        </UnavailableButton>
        <p role="alert" className="text-destructive text-center text-sm empty:hidden">
          {formError}
        </p>
        <Button type="submit" disabled={isPending} className="mt-3 w-full rounded-xl lg:rounded-md">
          Entrar
        </Button>
      </form>
    </Form>
  )
}
