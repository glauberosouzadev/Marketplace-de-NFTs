import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Control } from 'react-hook-form'
import type { Profile } from '@/contracts'
import { profileSchema, type ProfileFormValues } from '@/contracts/forms'
import { applyApiError } from '@/features/session/form-errors'
import { Button } from '@/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form'
import { Input } from '@/ui/input'
import {
  EMPTY_PASSWORD_FIELDS,
  ENS_SUFFIX,
  PROFILE_FORM_FIELDS,
  profileToFormValues,
} from '../form-values'
import { useSaveProfile } from '../save-profile'
import { AvatarField } from './avatar-field'
import { PasswordFields } from './password-fields'

const PASSWORD_SERVER_FIELDS = ['currentPassword', 'newPassword'] as const
const PASSWORD_NOT_SAVED = 'Dados do perfil salvos, mas a senha não foi alterada.'

interface FieldProps {
  control: Control<ProfileFormValues>
  name: keyof ProfileFormValues
  label: string
  type?: string
  autoComplete?: string
  prefix?: string
}

function ProfileField({ control, name, label, type, autoComplete, prefix }: FieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            <span aria-hidden className="text-primary">
              *
            </span>
          </FormLabel>
          <div className="flex gap-3">
            {prefix && (
              <span
                role="note"
                aria-label={`Domínio ${label}`}
                className="border-input bg-background flex h-[50px] w-[85px] shrink-0 items-center rounded-xl border px-3 text-sm lg:h-10 lg:rounded-md"
              >
                {prefix}
              </span>
            )}
            <FormControl>
              <Input type={type} autoComplete={autoComplete} aria-required {...field} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function ProfileForm({ uid, profile }: { uid: string; profile: Profile }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(profile),
  })
  const { save, isPending } = useSaveProfile(uid)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState('')

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    setSavedMessage('')
    const outcome = await save(values)
    if (outcome.status === 'profile-failed') {
      setFormError(applyApiError(form, outcome.error, PROFILE_FORM_FIELDS))
      return
    }
    const savedValues = { ...values, ...EMPTY_PASSWORD_FIELDS }
    if (outcome.status === 'password-failed') {
      // Perfil já persistido: rebaseia os dados e mantém a senha digitada para correção.
      form.reset(savedValues, { keepValues: true })
      const generalError = applyApiError(form, outcome.error, PASSWORD_SERVER_FIELDS)
      setFormError(generalError ? `${PASSWORD_NOT_SAVED} ${generalError}` : PASSWORD_NOT_SAVED)
      return
    }
    form.reset(savedValues)
    setSavedMessage(outcome.passwordChanged ? 'Perfil e senha salvos.' : 'Perfil salvo.')
  })

  const { control } = form
  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <ProfileField control={control} name="displayName" label="Nome de exibição" />
        <ProfileField control={control} name="username" label="Nome de usuário" />
        <ProfileField
          control={control}
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
        />
        <ProfileField
          control={control}
          name="ensName"
          label="Nome ENS"
          prefix={ENS_SUFFIX}
          autoComplete="off"
        />
        <ProfileField control={control} name="walletNickname" label="Apelido da carteira" />
        <AvatarField uid={uid} avatarUrl={profile.avatarUrl} />
        <PasswordFields control={control} />
        <div className="grid gap-3 md:col-span-2">
          <Button type="submit" disabled={isPending} className="w-full md:w-fit lg:px-3">
            Salvar
          </Button>
          <p role="alert" className="text-destructive text-sm empty:hidden">
            {formError}
          </p>
          <p role="status" className="text-sm empty:hidden">
            {form.formState.isDirty ? '' : savedMessage}
          </p>
        </div>
      </form>
    </Form>
  )
}
