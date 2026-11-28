import { useRouter } from '@tanstack/react-router'
import { useSession } from '@/features/session/queries'
import { Button } from '@/ui/button'
import { checkoutHref } from '../presentation'

interface CheckoutCtaProps {
  disabled: boolean
  /** Id do texto que explica o bloqueio, quando houver. */
  describedBy?: string | undefined
}

export function CheckoutCta({ disabled, describedBy }: CheckoutCtaProps) {
  const router = useRouter()
  const session = useSession()

  return (
    <Button
      type="button"
      variant="gradient"
      disabled={disabled || session.isPending}
      aria-describedby={describedBy}
      onClick={() => void router.navigate({ href: checkoutHref(Boolean(session.data)) })}
      className="lg:bg-primary w-full text-base lg:bg-none"
    >
      Conectar e finalizar
    </Button>
  )
}
