import { MutationObserver, type QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import type { ApiError, ListFavoritesResponse, NftSummary } from '@/contracts'
import { noticeBus } from '@/realtime/notices'

const request = vi.fn<(c: { method: string; url: string }) => Promise<unknown>>()
vi.mock('@/http/client', () => ({
  request: (c: { method: string; url: string }) => request(c),
}))

import { toggleFavoriteMutation, toNftSummary, type ToggleFavoriteVars } from './mutations'

const nft = (id: string): NftSummary => ({ id, name: `Obra ${id}` }) as NftSummary
const item = (id: string) => ({ nftId: id, createdAt: '2026-11-01T00:00:00Z', nft: nft(id) })
const transient: ApiError = { kind: 'network', code: 'TRANSIENT', message: 'x' }

interface Deferred {
  resolve: () => void
  reject: (e: unknown) => void
}

function deferredRequests(): Deferred[] {
  const pending: Deferred[] = []
  request.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        pending.push({ resolve: () => resolve(undefined), reject })
      }),
  )
  return pending
}

const ids = (client: QueryClient, uid = 'u-1') =>
  client.getQueryData<ListFavoritesResponse>(queryKeys.favorites(uid))?.items.map((i) => i.nftId)

const isInvalidated = (client: QueryClient, uid = 'u-1') =>
  client.getQueryState(queryKeys.favorites(uid))?.isInvalidated

function setup(initial: string[] = ['n1', 'n2']) {
  const client = createQueryClient()
  client.setQueryData(queryKeys.favorites('u-1'), { items: initial.map(item) })
  client.setQueryData(queryKeys.favorites('u-2'), { items: [item('n9')] })
  const toggle = (vars: ToggleFavoriteVars) =>
    new MutationObserver(client, toggleFavoriteMutation(client, 'u-1')).mutate(vars)
  return { client, toggle }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  request.mockReset()
  noticeBus.clear()
})

describe('toggleFavoriteMutation', () => {
  it('aplica o patch antes da resposta e, no sucesso, mantém e invalida só o usuário', async () => {
    const pending = deferredRequests()
    const { client, toggle } = setup(['n1'])
    const done = toggle({ nft: nft('n3'), favorite: true })
    await flush()
    expect(ids(client)).toEqual(['n3', 'n1'])
    expect(request).toHaveBeenCalledWith({ method: 'PUT', url: '/me/favorites/n3' })
    pending[0]?.resolve()
    await done
    expect(ids(client)).toEqual(['n3', 'n1'])
    expect(isInvalidated(client)).toBe(true)
    expect(isInvalidated(client, 'u-2')).toBe(false)
    expect(ids(client, 'u-2')).toEqual(['n9'])
  })

  it('desfavoritar remove o item da lista e a falha o devolve na mesma posição', async () => {
    const pending = deferredRequests()
    const { client, toggle } = setup(['n1', 'n2', 'n3'])
    const done = toggle({ nft: nft('n2'), favorite: false })
    await flush()
    expect(request).toHaveBeenCalledWith({ method: 'DELETE', url: '/me/favorites/n2' })
    expect(ids(client)).toEqual(['n1', 'n3'])
    pending[0]?.reject(transient)
    await expect(done).rejects.toBe(transient)
    expect(ids(client)).toEqual(['n1', 'n2', 'n3'])
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('falha ao favoritar desfaz o patch e publica aviso polite com o motivo', async () => {
    request.mockRejectedValue(transient)
    const { client, toggle } = setup(['n1'])
    await expect(toggle({ nft: nft('n3'), favorite: true })).rejects.toBe(transient)
    expect(ids(client)).toEqual(['n1'])
    const [notice] = noticeBus.getSnapshot()
    expect(notice?.politeness).toBe('polite')
    expect(notice?.text).toBe(
      'Não foi possível adicionar "Obra n3" aos favoritos. Algo deu errado. Tente novamente.',
    )
  })

  it('dois toggles rápidos serializam as requisições e terminam no último clique', async () => {
    const pending = deferredRequests()
    const { client, toggle } = setup(['n1'])
    const first = toggle({ nft: nft('n3'), favorite: true })
    const second = toggle({ nft: nft('n3'), favorite: false })
    await flush()
    expect(ids(client)).toEqual(['n1'])
    expect(request).toHaveBeenCalledTimes(1)
    pending[0]?.resolve()
    await first
    expect(isInvalidated(client)).toBe(false)
    await flush()
    expect(request).toHaveBeenLastCalledWith({ method: 'DELETE', url: '/me/favorites/n3' })
    pending[1]?.resolve()
    await second
    expect(ids(client)).toEqual(['n1'])
    expect(isInvalidated(client)).toBe(true)
  })

  it('falha de um toggle superado não desfaz o clique mais novo', async () => {
    const pending = deferredRequests()
    const { client, toggle } = setup(['n1'])
    const first = toggle({ nft: nft('n1'), favorite: false })
    const second = toggle({ nft: nft('n1'), favorite: true })
    await flush()
    expect(ids(client)).toEqual(['n1'])
    pending[0]?.reject(transient)
    await expect(first).rejects.toBe(transient)
    expect(ids(client)).toEqual(['n1'])
    await flush()
    pending[1]?.resolve()
    await second
    expect(ids(client)).toEqual(['n1'])
    expect(noticeBus.getSnapshot()).toHaveLength(1)
  })

  it('não faz retry e um 404 também volta o estado', async () => {
    const notFound: ApiError = { kind: 'http', status: 404, code: 'NOT_FOUND', message: 'x' }
    request.mockRejectedValue(notFound)
    const { client, toggle } = setup(['n1'])
    await expect(toggle({ nft: nft('n1'), favorite: false })).rejects.toBe(notFound)
    expect(request).toHaveBeenCalledTimes(1)
    expect(ids(client)).toEqual(['n1'])
    expect(noticeBus.getSnapshot()[0]?.text).toContain('remover "Obra n1" dos favoritos')
  })
})

describe('toNftSummary', () => {
  it('remove editions e mantém os demais campos', () => {
    const detail = { ...nft('a'), editions: [{ id: 'e1' }] } as unknown as NftSummary
    const summary = toNftSummary(detail)
    expect('editions' in summary).toBe(false)
    expect(summary).toEqual(nft('a'))
  })
})
