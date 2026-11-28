import { createContext, useContext } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { loginHref } from '@/contracts/search'
import { errorMessage } from '@/http/error-messages'
import type { Notice } from '@/realtime/notices'
import type { PrivateStateCleaner } from './mutations'

export interface PrivateStateDeps {
  restartRealtime: () => void | Promise<void>
  resetEventDedupe: () => void
  queryClient: Pick<QueryClient, 'cancelQueries' | 'clear'>
  clearSession: () => void
  clearUserStorage: (uid: string | null) => void
  navigate: (href: string) => void | Promise<void>
  publishNotice: (notice: Notice) => void
  dismissNotice: (id: string) => void
}

export interface SessionTeardown {
  clearPrivateState: PrivateStateCleaner
  expireSession: (currentHref: string) => Promise<void>
}

export const SESSION_EXPIRED_NOTICE_ID = 'session-expired'

export const expiredLoginHref = (currentHref: string): string => loginHref(currentHref, 'expired')

/**
 * Rotina única de encerramento (SDD-07, RN-13), na ordem fixa: socket → cache → armazenamento
 * → dedupe de eventos → navegação. Uma execução em andamento é reaproveitada por chamadas
 * simultâneas.
 */
export function createSessionTeardown(deps: PrivateStateDeps): SessionTeardown {
  let running: Promise<void> | null = null

  async function teardown(clearStorage: () => void, href: string): Promise<void> {
    await deps.restartRealtime()
    await deps.queryClient.cancelQueries()
    deps.queryClient.clear()
    clearStorage()
    deps.resetEventDedupe()
    await deps.navigate(href)
  }

  function once(start: () => Promise<void>): Promise<void> {
    running ??= start().finally(() => {
      running = null
    })
    return running
  }

  return {
    // Uma expiração em andamento não substitui o logout explícito: espera e completa a limpeza.
    clearPrivateState: async (uid) => {
      await running?.catch(() => undefined)
      deps.dismissNotice(SESSION_EXPIRED_NOTICE_ID)
      return once(() => teardown(() => deps.clearUserStorage(uid), '/'))
    },
    // Na expiração o rascunho `kurio:u:<uid>:*` fica para o relogin (Q-26); só a sessão sai.
    expireSession: (currentHref) => {
      deps.clearSession()
      return once(async () => {
        await teardown(deps.clearSession, expiredLoginHref(currentHref))
        deps.publishNotice({
          id: SESSION_EXPIRED_NOTICE_ID,
          politeness: 'assertive',
          text: errorMessage('SESSION_EXPIRED'),
        })
      })
    },
  }
}

const PrivateStateCleanerContext = createContext<PrivateStateCleaner | null>(null)

export const PrivateStateCleanerProvider = PrivateStateCleanerContext.Provider

export function usePrivateStateCleaner(): PrivateStateCleaner {
  const cleaner = useContext(PrivateStateCleanerContext)
  if (!cleaner) throw new Error('PrivateStateCleanerProvider ausente')
  return cleaner
}
