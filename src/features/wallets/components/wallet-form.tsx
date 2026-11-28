import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import type { Wallet, WalletSlot } from '@/contracts'
import { applyApiError } from '@/features/session/form-errors'
import { Button } from '@/ui/button'
import { Form } from '@/ui/form'
import { useUpsertWallet } from '../mutations'
import {
  NETWORK_OPTIONS,
  PROVIDER_OPTIONS,
  WALLET_FORM_FIELDS,
  toUpsertRequest,
  walletFormSchema,
  walletToFormValues,
  type WalletFormValues,
} from '../validation'
import { EnsField, SelectField, TextField } from './wallet-fields'

interface WalletFormProps {
  uid: string
  slot: WalletSlot
  wallet: Wallet | null
  /** Caminho interno para voltar após salvar (ex.: o pagamento). */
  returnTo?: string | undefined
  /** Leva o foco ao primeiro campo ao montar (formulário revelado pelo usuário). */
  focusOnMount?: boolean
}

export function WalletForm({ uid, slot, wallet, returnTo, focusOnMount = false }: WalletFormProps) {
  const router = useRouter()
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: walletToFormValues(wallet),
  })
  const { setFocus } = form
  useEffect(() => {
    if (focusOnMount) setFocus('displayName')
  }, [focusOnMount, setFocus])
  const { mutate, isPending } = useUpsertWallet(uid)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const submit = form.handleSubmit((values) => {
    const body = toUpsertRequest(values)
    if (!body) return
    setFormError(null)
    setSaved(false)
    mutate(
      { slot, body },
      {
        onSuccess: () => {
          form.reset(values)
          setSaved(true)
          if (returnTo) void router.navigate({ href: returnTo })
        },
        onError: (error) => setFormError(applyApiError(form, error, WALLET_FORM_FIELDS)),
      },
    )
  })

  const { control } = form
  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <TextField control={control} name="displayName" label="Nome de exibição" required />
        <TextField control={control} name="nickname" label="Apelido da carteira" required />
        <SelectField
          control={control}
          name="network"
          label="Rede"
          placeholder="Selecione uma rede"
          options={NETWORK_OPTIONS}
        />
        <TextField control={control} name="profileName" label="Nome do perfil" required />
        <TextField
          control={control}
          name="address"
          label="Endereço da carteira"
          placeholder="Endereço 0x da carteira"
          required
          autoComplete="off"
        />
        <TextField
          control={control}
          name="secondaryRef"
          label="ENS ou carteira secundária (opcional)"
          placeholder="ENS ou carteira secundária (opcional)"
          hideLabel
          autoComplete="off"
        />
        <SelectField
          control={control}
          name="provider"
          label="Tipo de carteira"
          placeholder="Selecione uma carteira"
          options={PROVIDER_OPTIONS}
        />
        <TextField control={control} name="referralCode" label="Código de indicação" />
        <TextField
          control={control}
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          required
        />
        <EnsField control={control} />
        <div className="grid gap-3 md:col-span-2">
          <Button type="submit" disabled={isPending} className="w-full md:w-fit lg:px-3">
            Salvar carteira
          </Button>
          <p role="alert" className="text-destructive text-sm empty:hidden">
            {formError}
          </p>
          <p role="status" className="text-sm empty:hidden">
            {saved ? 'Carteira salva.' : ''}
          </p>
        </div>
      </form>
    </Form>
  )
}
