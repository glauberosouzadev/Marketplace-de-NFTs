import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { noticeBus } from '@/realtime/notices'
import { Button } from '@/ui/button'
import { createAnnouncer } from './announcer'

const AnnounceContext = createContext<(text: string) => void>(() => {})

/** Uma única região `role="status"` para todos os gatilhos inertes (o modal esconde a global). */
export function UnavailableNoticeProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('')
  const announcer = useMemo(() => createAnnouncer(setText), [])
  useEffect(() => announcer.cancel, [announcer])
  return (
    <AnnounceContext.Provider value={announcer.announce}>
      {children}
      <span role="status" className="sr-only">
        {text}
      </span>
    </AnnounceContext.Provider>
  )
}

/** Gatilho inerte (Q-15): nunca autentica; avisa pelo `noticeBus` e pela região local. */
export function UnavailableButton({
  feature,
  onClick,
  ...props
}: ComponentProps<'button'> & { feature: string }) {
  const announce = useContext(AnnounceContext)
  const text = `${feature} indisponível na demonstração.`
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event)
        announce(text)
        noticeBus.publish({ id: 'auth-unavailable', politeness: 'polite', text })
      }}
    />
  )
}

function Brand({ children }: { children: string }) {
  return (
    <span aria-hidden className="w-5 text-center text-base leading-none font-bold">
      {children}
    </span>
  )
}

function SocialButton({ feature, mark }: { feature: string; mark: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-10 w-full rounded-sm text-xs">
      <UnavailableButton feature={`Entrar com ${feature}`}>
        <Brand>{mark}</Brand>
        Continuar com {feature}
      </UnavailableButton>
    </Button>
  )
}

export function SocialButtons() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 text-xs">
        <span aria-hidden className="bg-border h-px flex-1" />
        <span>Ou continue com</span>
        <span aria-hidden className="bg-border h-px flex-1" />
      </div>
      <SocialButton feature="Google" mark="G" />
      <SocialButton feature="Facebook" mark="f" />
    </div>
  )
}
