import { useEffect, useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { ApiError, Collector, Wallet } from '@/contracts'
import { applyApiError } from '@/features/session/form-errors'
import { EnsField, SelectField, TextField } from '@/features/wallets/components/wallet-fields'
import {
  NETWORK_OPTIONS,
  PROVIDER_OPTIONS,
  WALLET_FORM_FIELDS,
  walletFormSchema,
  walletToFormValues,
  type WalletFormValues,
} from '@/features/wallets/validation'
import { Checkbox } from '@/ui/checkbox'
import { Form } from '@/ui/form'
import { Label } from '@/ui/label'
import {
  NOTE_MAX_LENGTH,
  collectorDefaults,
  firstFocusableInvalid,
  toCollector,
} from '../collector-values'

export const COLLECTOR_FORM_ID = 'collector-form'

interface CollectorFormProps {
  wallet: Wallet | null
  collector: Collector
  /** Erro 422 do envio: `fieldErrors` vão para os campos (FR-27). */
  apiError: ApiError | null
  onChange: (collector: Collector) => void
  onValid: (collector: Collector) => void
}

/** Perfil do colecionador. Valida os campos com `*` do layout; edições valem só para o pedido. */
export function CollectorForm({
  wallet,
  collector,
  apiError,
  onChange,
  onValid,
}: CollectorFormProps) {
  const [defaults] = useState(() => collectorDefaults(wallet, collector))
  const [useOtherWallet, setUseOtherWallet] = useState(defaults.useOtherWallet)
  const [note, setNote] = useState(defaults.note)
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    mode: 'onBlur',
    shouldFocusError: false,
    defaultValues: defaults.values,
  })
  const otherId = useId()
  const noteId = useId()
  const { control } = form
  const locked = wallet !== null && !useOtherWallet

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => onChange(toCollector(values, useOtherWallet, note)),
    })
  }, [form, onChange, useOtherWallet, note])

  useEffect(() => {
    if (apiError?.fieldErrors && Object.keys(apiError.fieldErrors).length > 0)
      applyApiError(form, apiError, WALLET_FORM_FIELDS)
  }, [form, apiError])

  function toggleOtherWallet(checked: boolean): void {
    setUseOtherWallet(checked)
    if (!checked) form.reset(walletToFormValues(wallet))
    onChange(toCollector(form.getValues(), checked, note))
  }

  function changeNote(value: string): void {
    setNote(value)
    onChange(toCollector(form.getValues(), useOtherWallet, value))
  }

  // Campo travado não recebe foco: vai ao primeiro editável ou ao "Usar outra carteira?".
  const submit = form.handleSubmit(
    (values) => onValid(toCollector(values, useOtherWallet, note)),
    (errors) => {
      const field = firstFocusableInvalid(new Set(Object.keys(errors)), locked)
      if (field) form.setFocus(field)
      else document.getElementById(otherId)?.focus()
    },
  )

  return (
    <Form {...form}>
      <form
        id={COLLECTOR_FORM_ID}
        onSubmit={submit}
        noValidate
        className="grid gap-x-8 gap-y-5 md:grid-cols-2"
      >
        <TextField control={control} name="displayName" label="Nome de exibição" required />
        <TextField
          control={control}
          name="nickname"
          label="Nome de usuário"
          required
          disabled={locked}
        />
        <SelectField
          control={control}
          name="network"
          label="Rede"
          placeholder="Selecione uma rede"
          options={NETWORK_OPTIONS}
          disabled={locked}
        />
        <TextField control={control} name="profileName" label="Nome do perfil" required />
        <TextField
          control={control}
          name="address"
          label="Endereço da carteira"
          placeholder="Endereço 0x da carteira"
          required
          autoComplete="off"
          disabled={locked}
        />
        <TextField
          control={control}
          name="secondaryRef"
          label="ENS ou carteira secundária (opcional)"
          placeholder="ENS ou carteira secundária (opcional)"
          hideLabel
          autoComplete="off"
          disabled={locked}
        />
        <SelectField
          control={control}
          name="provider"
          label="Tipo de carteira"
          placeholder="Selecione uma carteira"
          options={PROVIDER_OPTIONS}
          disabled={locked}
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
        <EnsField control={control} disabled={locked} />
        <div className="flex items-center gap-2 md:col-span-2">
          <Checkbox
            id={otherId}
            checked={useOtherWallet}
            onCheckedChange={(checked) => toggleOtherWallet(checked === true)}
            className="size-5 rounded-full border-2"
          />
          <Label htmlFor={otherId}>Usar outra carteira?</Label>
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor={noteId}>Observação do colecionador (opcional)</Label>
          <textarea
            id={noteId}
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(event) => changeNote(event.target.value)}
            className="border-input bg-background text-foreground focus-visible:border-primary focus-visible:ring-ring focus-visible:ring-offset-background h-[152px] w-full resize-y rounded-xl border p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:max-w-[350px] lg:rounded-md"
          />
        </div>
      </form>
    </Form>
  )
}
