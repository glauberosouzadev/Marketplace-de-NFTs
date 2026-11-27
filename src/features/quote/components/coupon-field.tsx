import { useId, useRef, useState, type FormEvent } from 'react'
import { useClearCoupon, useSetCoupon } from '@/features/cart/mutations'
import { isSessionExpired } from '@/http/normalize-error'
import { noticeBus } from '@/realtime/notices'
import { Input } from '@/ui/input'
import { EMPTY_COUPON_TEXT, couponErrorMessage } from '../presentation'

const NOTICE_ID = 'cart-coupon'

function announce(text: string, politeness: 'polite' | 'assertive'): void {
  noticeBus.dismiss(NOTICE_ID)
  noticeBus.publish({ id: NOTICE_ID, politeness, text })
}

// O campo e o botão trocam de lugar ao aplicar/remover; o foco segue para o controle que aparece.
const focusNextFrame = (target: { current: HTMLElement | null }): void => {
  requestAnimationFrame(() => target.current?.focus())
}

interface CouponFieldProps {
  appliedCode: string | undefined
  /** Só bloqueia aplicar: remover um cupom salvo fica sempre disponível (sem estado sem saída). */
  applyDisabled: boolean
}

/** Cupom salvo no carrinho (PUT/DELETE /cart/coupon); erro não toca resumo nem carrinho (FR-23). */
export function CouponField({ appliedCode, applyDisabled }: CouponFieldProps) {
  const inputId = useId()
  const errorId = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const removeRef = useRef<HTMLButtonElement>(null)
  const setCoupon = useSetCoupon()
  const clearCoupon = useClearCoupon()

  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError(EMPTY_COUPON_TEXT)
      return
    }
    setError(null)
    setCoupon.mutateAsync({ code: trimmed }).then(
      () => {
        setCode('')
        announce(`Cupom ${trimmed} aplicado.`, 'polite')
        focusNextFrame(removeRef)
      },
      (failure: unknown) => setError(couponErrorMessage(failure)),
    )
  }

  const remove = (): void => {
    clearCoupon.mutateAsync().then(
      () => {
        announce('Cupom removido. Resumo recalculado sem desconto.', 'polite')
        focusNextFrame(inputRef)
      },
      (failure: unknown) => {
        if (!isSessionExpired(failure)) announce(couponErrorMessage(failure), 'assertive')
      },
    )
  }

  if (appliedCode) {
    return (
      <div className="border-border flex h-[50px] items-center justify-between gap-3 rounded-full border px-5 lg:h-10 lg:rounded-md lg:px-3">
        <p className="min-w-0 truncate text-sm">
          Cupom <span className="font-bold">{appliedCode}</span>
        </p>
        <button
          ref={removeRef}
          type="button"
          disabled={clearCoupon.isPending}
          aria-busy={clearCoupon.isPending}
          onClick={remove}
          className="text-price focus-visible:ring-ring shrink-0 rounded-sm text-sm font-bold underline-offset-4 outline-none hover:underline focus-visible:ring-2 disabled:opacity-50"
        >
          Remover cupom
        </button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={apply} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="sr-only">
        Código promocional
      </label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          name="coupon"
          autoComplete="off"
          placeholder="Digite o código promocional..."
          value={code}
          disabled={applyDisabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setCode(event.target.value)
            if (error) setError(null)
          }}
          className="rounded-full pr-[104px] pl-4 placeholder:text-xs lg:rounded-md lg:pl-3 lg:placeholder:text-sm"
        />
        <button
          type="submit"
          disabled={applyDisabled || setCoupon.isPending}
          aria-busy={setCoupon.isPending}
          className="bg-primary-gradient text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-card lg:bg-primary absolute inset-y-0 right-0 rounded-full px-5 text-sm font-bold outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-l-none lg:rounded-r-md lg:bg-none lg:px-4"
        >
          Aplicar
        </button>
      </div>
      <p id={errorId} role="alert" className="text-destructive px-5 text-xs empty:hidden lg:px-0">
        {error}
      </p>
    </form>
  )
}
