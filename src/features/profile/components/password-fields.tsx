import type { Control } from 'react-hook-form'
import type { ProfileFormValues } from '@/contracts/forms'
import { PasswordInput } from '@/features/session/components/password-input'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form'

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'

const FIELDS: readonly { name: PasswordField; label: string; autoComplete: string }[] = [
  { name: 'currentPassword', label: 'Senha atual', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Nova senha', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirmar nova senha', autoComplete: 'new-password' },
]

export function PasswordFields({ control }: { control: Control<ProfileFormValues> }) {
  return (
    <fieldset className="grid gap-5">
      <legend className="mb-5 text-base font-bold">Alterar senha</legend>
      {FIELDS.map(({ name, label, autoComplete }) => (
        <FormField
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete={autoComplete} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </fieldset>
  )
}
