import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import { errorMessage } from '@/http/error-messages'
import type { Notice } from '@/realtime/notices'
import { createSessionTeardown, expiredLoginHref } from './clear-private-state'

function setup() {
  const order: string[] = []
  const notices: Notice[] = []
  const client = createQueryClient()
  client.setQueryData(queryKeys.cart(['user', 'u-a']), { id: 'c-a' })
  client.setQueryData(queryKeys.favorites('u-a'), ['n1'])
  const cancelQueries = client.cancelQueries.bind(client)
  const clear = client.clear.bind(client)
  const teardown = createSessionTeardown({
    restartRealtime: vi.fn(() => void order.push('socket')),
    resetEventDedupe: vi.fn(() => void order.push('dedupe')),
    queryClient: {
      cancelQueries: () => {
        order.push('cancel')
        return cancelQueries()
      },
      clear: () => {
        order.push('clear')
        clear()
      },
    },
    clearSession: vi.fn(() => void order.push('session')),
    clearUserStorage: vi.fn((uid: string | null) => void order.push(`storage:${uid}`)),
    navigate: vi.fn((href: string) => void order.push(`nav:${href}`)),
    publishNotice: (n) => void notices.push(n),
    dismissNotice: (id) => {
      const i = notices.findIndex((n) => n.id === id)
      if (i >= 0) notices.splice(i, 1)
    },
  })
  return { client, order, notices, teardown }
}

describe('logout / troca de usuário', () => {
  it('segue a ordem fixa e esvazia o cache inteiro', async () => {
    const { client, order, teardown } = setup()
    await teardown.clearPrivateState('u-a')
    expect(order).toEqual(['socket', 'cancel', 'clear', 'storage:u-a', 'dedupe', 'nav:/'])
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('chamadas simultâneas executam uma única vez; depois volta a executar', async () => {
    const { order, teardown } = setup()
    await Promise.all([teardown.clearPrivateState('u-a'), teardown.clearPrivateState('u-a')])
    expect(order.filter((s) => s === 'socket')).toHaveLength(1)
    await teardown.clearPrivateState(null)
    expect(order.filter((s) => s === 'socket')).toHaveLength(2)
  })

  it('expiração em andamento (401 do logout) não substitui o logout explícito', async () => {
    const { order, notices, teardown } = setup()
    const expiring = teardown.expireSession('/perfil')
    await teardown.clearPrivateState('u-a')
    await expiring
    expect(order).toContain('storage:u-a')
    expect(order.at(-1)).toBe('nav:/')
    expect(notices).toHaveLength(0)
  })
})

describe('expiração', () => {
  it('encerra a sessão antes de tudo, preserva o rascunho e vai ao login com retorno', async () => {
    const { order, notices, teardown } = setup()
    await teardown.expireSession('/pagamento?step=2')
    expect(order).toEqual([
      'session',
      'socket',
      'cancel',
      'clear',
      'session',
      'dedupe',
      `nav:${expiredLoginHref('/pagamento?step=2')}`,
    ])
    expect(order.some((s) => s.startsWith('storage:'))).toBe(false)
    expect(notices).toEqual([
      { id: 'session-expired', politeness: 'assertive', text: errorMessage('SESSION_EXPIRED') },
    ])
  })

  it('dois 401 simultâneos limpam uma única vez', async () => {
    const { order, notices, teardown } = setup()
    await Promise.all([teardown.expireSession('/perfil'), teardown.expireSession('/perfil')])
    expect(order.filter((s) => s === 'clear')).toHaveLength(1)
    expect(notices).toHaveLength(1)
  })
})

describe('expiredLoginHref', () => {
  it('codifica a rota atual e marca reason=expired', () => {
    const url = new URL(expiredLoginHref('/pagamento?step=2'), 'http://x')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/pagamento?step=2')
    expect(url.searchParams.get('reason')).toBe('expired')
  })

  it.each(['https://evil.io/x', '//evil.io/x', '/\\evil.io/x', 'perfil'])(
    'rota não interna (%s) vira /',
    (href) => {
      const url = new URL(expiredLoginHref(href), 'http://x')
      expect(url.searchParams.get('redirect')).toBe('/')
    },
  )
})
