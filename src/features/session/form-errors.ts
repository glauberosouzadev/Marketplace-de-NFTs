import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import type { ApiError, ErrorCode } from '@/contracts'
import { errorMessage } from '@/http/error-messages'
import { isApiError } from '@/http/normalize-error'

const TAKEN_BY_FIELD: Partial<Record<string, ErrorCode>> = {
  email: 'EMAIL_TAKEN',
  username: 'USERNAME_TAKEN',
}

function fieldMessage(error: ApiError, field: string, raw: string): string {
  return error.status === 409 && TAKEN_BY_FIELD[field] ? errorMessage(TAKEN_BY_FIELD[field]) : raw
}

/**
 * Leva `fieldErrors` da API para os campos (foco no primeiro, na ordem de `fields`).
 * Sem erro de campo, devolve a mensagem geral do formulário.
 */
export function applyApiError<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, 'setError' | 'setFocus'>,
  error: unknown,
  fields: readonly Path<T>[],
): string | null {
  const apiError = isApiError(error) ? error : null
  const fieldErrors = apiError?.fieldErrors ?? {}
  const invalid = fields.filter((field) => fieldErrors[field])
  if (!apiError || invalid.length === 0) return errorMessage(apiError?.code ?? 'TRANSIENT')
  for (const field of invalid)
    form.setError(field, {
      type: 'server',
      message: fieldMessage(apiError, field, fieldErrors[field] as string),
    })
  form.setFocus(invalid[0] as Path<T>)
  return null
}
