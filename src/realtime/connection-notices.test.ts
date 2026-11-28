import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import { createConnectionNotices } from './connection-notices'
import { connectionStatus } from './connection-status'
import { noticeBus } from './notices'
import { refetchActiveResources } from './refetch-active'

describe('createConnectionNotices', () => {
  const onReconnected = vi.fn()
  let unsubscribe: () => void
  let dispose: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    noticeBus.clear()
    onReconnected.mockClear()
    connectionStatus.set('idle')
    const notices = createConnectionNotices({ notices: noticeBus, onReconnected })
    dispose = notices.dispose
    unsubscribe = connectionStatus.subscribe(notices.listener)
  })
  afterEach(() => {
    unsubscribe()
    vi.useRealTimers()
  })

  const texts = () => noticeBus.getSnapshot().map((n) => n.text)

  it('primeira conexão não publica aviso nem refetch', () => {
    connectionStatus.set('connecting')
    connectionStatus.set('connected')
    expect(texts()).toEqual([])
    expect(onReconnected).not.toHaveBeenCalled()
  })

  it('queda publica Reconectando uma vez e reconexão troca por Reconectado e refaz', () => {
    connectionStatus.set('connecting')
    connectionStatus.set('connected')
    connectionStatus.set('reconnecting')
    connectionStatus.set('reconnecting')
    expect(texts()).toEqual(['Reconectando…'])
    connectionStatus.set('connected')
    expect(texts()).toEqual(['Reconectado'])
    expect(onReconnected).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(3000)
    expect(texts()).toEqual([])
  })

  it('recriação do socket durante a queda não deixa aviso preso', () => {
    connectionStatus.set('connecting')
    connectionStatus.set('connected')
    connectionStatus.set('reconnecting')
    connectionStatus.set('connecting')
    connectionStatus.set('connected')
    expect(texts()).toEqual([])
    expect(onReconnected).not.toHaveBeenCalled()
  })

  it('dispose remove avisos e cancela o timer', () => {
    connectionStatus.set('connecting')
    connectionStatus.set('connected')
    connectionStatus.set('reconnecting')
    connectionStatus.set('connected')
    dispose()
    expect(texts()).toEqual([])
  })

  it('restart (idle) limpa os avisos de conexão', () => {
    connectionStatus.set('connecting')
    connectionStatus.set('connected')
    connectionStatus.set('reconnecting')
    connectionStatus.set('idle')
    expect(texts()).toEqual([])
  })
})

describe('refetchActiveResources', () => {
  it('invalida só consultas ativas do escopo do usuário e públicas', async () => {
    const queryClient = createQueryClient()
    const fetchers = {
      cart: vi.fn(async () => 'c'),
      order: vi.fn(async () => 'o'),
      nft: vi.fn(async () => 'n'),
      other: vi.fn(async () => 'x'),
    }
    const scope = ['user', 'u1'] as const
    const observe = (key: readonly unknown[], fn: () => Promise<string>) =>
      queryClient.getQueryCache().build(queryClient, { queryKey: key, queryFn: fn })
    const mount = async (key: readonly unknown[], fn: () => Promise<string>) => {
      const observer = (await import('@tanstack/react-query')).QueryObserver
      const o = new observer(queryClient, { queryKey: key, queryFn: fn })
      o.subscribe(() => undefined)
      await vi.waitFor(() => expect(fn).toHaveBeenCalled())
    }
    await mount(queryKeys.cart(scope), fetchers.cart)
    await mount(queryKeys.order('u1', 'o1'), fetchers.order)
    await mount(queryKeys.nft('n1'), fetchers.nft)
    await mount(queryKeys.cart(['user', 'u2']), fetchers.other)
    observe(queryKeys.nft('inativo'), async () => 'i')
    Object.values(fetchers).forEach((f) => f.mockClear())

    await refetchActiveResources(queryClient, scope)

    expect(fetchers.cart).toHaveBeenCalledTimes(1)
    expect(fetchers.order).toHaveBeenCalledTimes(1)
    expect(fetchers.nft).toHaveBeenCalledTimes(1)
    expect(fetchers.other).not.toHaveBeenCalled()
  })
})
