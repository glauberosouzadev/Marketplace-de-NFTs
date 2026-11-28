import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { ImageUp } from 'lucide-react'
import { errorMessage } from '@/http/error-messages'
import { isApiError } from '@/http/normalize-error'
import { Button } from '@/ui/button'
import { AVATAR_ACCEPT, validateAvatarFile } from '../avatar-rules'
import { useRemoveAvatar, useUploadAvatar } from '../mutations'

interface AvatarFieldProps {
  uid: string
  avatarUrl?: string | undefined
}

function failureMessage(error: unknown): string {
  if (isApiError(error) && error.fieldErrors?.file) return error.fieldErrors.file
  return errorMessage(isApiError(error) ? error.code : 'TRANSIENT')
}

export function AvatarField({ uid, avatarUrl }: AvatarFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const upload = useUploadAvatar(uid)
  const remove = useRemoveAvatar(uid)
  const [preview, setPreview] = useState<string | null>(null)
  const [removed, setRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const busy = upload.isPending || remove.isPending

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const fail = (cause: unknown) => {
    setPreview(null)
    setError(failureMessage(cause))
  }

  const onChoose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setNotice('')
    const invalid = validateAvatarFile(file)
    if (invalid) return setError(invalid)
    setError(null)
    setPreview(URL.createObjectURL(file))
    upload.mutate(
      { file },
      {
        onSuccess: () => {
          setRemoved(false)
          setNotice('Avatar atualizado.')
        },
        onError: fail,
      },
    )
  }

  const onRemove = () => {
    setError(null)
    setNotice('')
    remove.mutate(undefined, {
      onSuccess: () => {
        setPreview(null)
        setRemoved(true)
        setNotice('Avatar removido.')
      },
      onError: fail,
    })
  }

  const shown = preview ?? (removed ? undefined : avatarUrl)
  return (
    <div className="grid gap-3">
      <span className="text-sm font-medium">Avatar</span>
      <div className="flex items-center gap-4">
        {shown ? (
          <img src={shown} alt="Seu avatar" className="size-[50px] rounded-full object-cover" />
        ) : (
          <span
            role="img"
            aria-label="Avatar padrão"
            className="border-border bg-secondary text-primary flex size-[50px] items-center justify-center rounded-full border"
          >
            <ImageUp aria-hidden className="size-5" />
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          onChange={onChoose}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
        <Button
          type="button"
          size="sm"
          disabled={busy}
          aria-describedby={error ? errorId : undefined}
          aria-label="Alterar avatar"
          onClick={() => inputRef.current?.click()}
          className="lg:rounded-sm"
        >
          Alterar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy || !shown}
          aria-label="Remover avatar"
          onClick={onRemove}
          className="font-normal lg:rounded-sm"
        >
          Remover
        </Button>
      </div>
      <p id={errorId} role="alert" className="text-destructive text-sm empty:hidden">
        {error}
      </p>
      <p role="status" className="text-sm empty:hidden">
        {notice}
      </p>
    </div>
  )
}
