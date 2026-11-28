import type { Control } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form'
import { Input } from '@/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { ENS_SUFFIX, type WalletFormValues } from '../validation'

export type TextName = Exclude<keyof WalletFormValues, 'network' | 'provider'>

interface TextFieldProps {
  control: Control<WalletFormValues>
  name: TextName
  label: string
  required?: boolean
  placeholder?: string
  hideLabel?: boolean
  type?: string
  autoComplete?: string
  disabled?: boolean
}

export function TextField({
  control,
  name,
  label,
  required = false,
  placeholder,
  hideLabel = false,
  type,
  autoComplete,
  disabled,
}: TextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={hideLabel ? 'sr-only' : undefined}>
            {label}
            {required && (
              <span aria-hidden className="text-primary">
                *
              </span>
            )}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              autoComplete={autoComplete}
              placeholder={placeholder}
              aria-required={required || undefined}
              {...field}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface SelectFieldProps {
  control: Control<WalletFormValues>
  name: 'network' | 'provider'
  label: string
  placeholder: string
  options: readonly { value: string; label: string }[]
  disabled?: boolean
}

export function SelectField({
  control,
  name,
  label,
  placeholder,
  options,
  disabled,
}: SelectFieldProps) {
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
          <Select
            value={field.value}
            onValueChange={field.onChange}
            name={field.name}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function EnsField({
  control,
  disabled,
}: {
  control: Control<WalletFormValues>
  disabled?: boolean
}) {
  return (
    <FormField
      control={control}
      name="ensName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Nome ENS
            <span aria-hidden className="text-primary">
              *
            </span>
          </FormLabel>
          <div className="flex gap-3">
            <Select value={ENS_SUFFIX}>
              <SelectTrigger aria-label="Domínio ENS" className="w-[85px] shrink-0 px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ENS_SUFFIX}>{ENS_SUFFIX}</SelectItem>
              </SelectContent>
            </Select>
            <FormControl>
              <Input autoComplete="off" aria-required {...field} disabled={disabled} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
