import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { authSearchSchema, type AuthSearch } from '@/contracts'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/use-media-query'
import { noticeBus } from '@/realtime/notices'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/ui/dialog'
import { SESSION_EXPIRED_NOTICE_ID } from '../clear-private-state'
import { AuthFormLogin } from './auth-form-login'
import { AuthFormRegister } from './auth-form-register'
import { SocialButtons, UnavailableNoticeProvider } from './social-buttons'

export type AuthMode = 'login' | 'register'
type AuthPath = '/login' | '/cadastro'

const COPY = {
  login: {
    title: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    pageTitle: 'Entrar',
    switchText: 'Novo na Kurio? Crie uma conta',
    switchTo: '/cadastro',
  },
  register: {
    title: 'Criar conta',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    pageTitle: 'Criar perfil de colecionador',
    switchText: 'Já tem uma conta? Entre',
    switchTo: '/login',
  },
} as const

/** O `redirect` padrão (`/`) não aparece na URL. */
const toSearch = ({ redirect, reason }: AuthSearch) => ({
  ...(redirect !== '/' ? { redirect } : {}),
  ...(reason ? { reason } : {}),
})

/**
 * No modal, o Radix deixa o resto da página inerte: o toast global de expiração ficaria atrás do
 * overlay e oculto ao leitor de tela. O próprio modal mostra e descreve o aviso; o toast sai.
 */
function useDismissNoticeWhile(id: string, active: boolean): void {
  const present = useSyncExternalStore(noticeBus.subscribe, () =>
    noticeBus.getSnapshot().some((n) => n.id === id),
  )
  useEffect(() => {
    if (active && present) noticeBus.dismiss(id)
  }, [id, active, present])
}

interface AuthShellProps {
  mode: AuthMode
  /** Início renderizado atrás do modal (só em ≥ 1024 px). */
  background: ReactNode
}

export function AuthShell({ mode, background }: AuthShellProps) {
  const search = authSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  // A rota abre o modal sem DialogTrigger; guarda quem tinha o foco para devolvê-lo ao fechar.
  const opener = useRef<Element | null>(null)
  opener.current ??= document.activeElement
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const copy = COPY[mode]
  const linkSearch = toSearch(search)
  const expiredId = useId()
  const expired = mode === 'login' && search.reason === 'expired'
  useDismissNoticeWhile(SESSION_EXPIRED_NOTICE_ID, isDesktop && expired)

  const goBack = () => void navigate({ href: search.redirect })
  const form =
    mode === 'login' ? (
      <AuthFormLogin expiredId={expired ? expiredId : undefined} onSuccess={goBack} />
    ) : (
      <AuthFormRegister
        submitLabel={isDesktop ? 'Criar conta' : 'Criar perfil'}
        onSuccess={goBack}
      />
    )

  if (!isDesktop)
    return (
      <main className="bg-background fixed inset-0 z-50 overflow-y-auto">
        <UnavailableNoticeProvider>
          <div className="mx-auto flex min-h-full w-full max-w-[414px] flex-col px-7 pt-28 pb-10">
            <p
              aria-hidden
              className="text-center text-[32px] leading-none font-bold tracking-[0.2em]"
            >
              KURIO
            </p>
            <h1 className="mt-[70px] mb-6 text-center text-lg font-bold">{copy.pageTitle}</h1>
            {form}
            <div className="mt-8">
              <SocialButtons />
            </div>
            <Link
              to={copy.switchTo}
              search={linkSearch}
              className="text-muted-foreground focus-visible:ring-ring mt-10 self-center rounded-sm text-sm outline-none focus-visible:ring-2"
            >
              {copy.switchText}
            </Link>
          </div>
        </UnavailableNoticeProvider>
      </main>
    )

  return (
    <>
      {background}
      <Dialog open onOpenChange={(open) => !open && goBack()}>
        <DialogContent
          aria-describedby={expired ? expiredId : undefined}
          onCloseAutoFocus={(event) => {
            const target = opener.current
            if (target instanceof HTMLElement && target.isConnected) {
              event.preventDefault()
              target.focus()
            }
          }}
          className="[&>button]:text-price max-w-[500px] gap-0 rounded-none p-0 sm:max-w-[500px]"
        >
          <UnavailableNoticeProvider>
            <div className="px-20 pt-12 pb-10">
              <DialogTitle className="sr-only">{copy.title}</DialogTitle>
              <nav
                aria-label="Entrar ou criar conta"
                className="flex items-center justify-center gap-3 text-xl"
              >
                <TabLink to="/login" active={mode === 'login'} search={linkSearch}>
                  Entrar
                </TabLink>
                <span aria-hidden className="bg-price h-5 w-px" />
                <TabLink to="/cadastro" active={mode === 'register'} search={linkSearch}>
                  Criar conta
                </TabLink>
              </nav>
              <DialogDescription className="text-foreground mt-6 mb-7 text-center text-xs">
                {copy.description}
              </DialogDescription>
              {form}
            </div>
            <div className="border-border border-t px-20 pt-4 pb-14">
              <SocialButtons />
            </div>
          </UnavailableNoticeProvider>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface TabLinkProps {
  to: AuthPath
  active: boolean
  search: ReturnType<typeof toSearch>
  children: string
}

function TabLink({ to, active, search, children }: TabLinkProps) {
  return (
    <Link
      to={to}
      search={search}
      replace
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-visible:ring-ring rounded-sm font-bold outline-none focus-visible:ring-2',
        active ? 'text-price' : 'text-foreground',
      )}
    >
      {children}
    </Link>
  )
}
