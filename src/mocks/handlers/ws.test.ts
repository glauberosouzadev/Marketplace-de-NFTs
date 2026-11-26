import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { OrderUpdatedEvent } from '@/contracts'
import { getDb, mutateDb } from '../db/store'
import { emitEvent, realtimeHandler, setRealtimeDown, updateNft } from './ws'

const URL_WS = 'wss://realtime.kurio.invalid/socket.io/?EIO=4&transport=websocket'
const TOKEN = 'tok-user-001'

const server = setupServer(realtimeHandler)
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  mutateDb((db) => {
    db.sessions.push({ token: TOKEN, userId: 'user-001', expiresAt: '2999-01-01T00:00:00.000Z' })
  })
})
afterAll(() => server.close())

function orderEvent(audience: OrderUpdatedEvent['audience']): OrderUpdatedEvent {
  return {
    id: 'evt-000001',
    version: 2,
    occurredAt: '2026-11-26T00:00:00.000Z',
    audience,
    type: 'order.updated',
    resource: { type: 'order', id: 'order-1' },
    data: { status: 'confirmed' },
  }
}

// Frames iguais aos do socket.io-client: CONNECT `40{auth}` depois do open `0{...}`.
async function connect(auth: object | null): Promise<{ socket: WebSocket; frames: string[] }> {
  const socket = new WebSocket(URL_WS)
  const frames: string[] = []
  socket.addEventListener('message', (event) => frames.push(String(event.data)))
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
  await expect.poll(() => frames.some((f) => f.startsWith('0{'))).toBe(true)
  socket.send(auth ? `40${JSON.stringify(auth)}` : '40')
  await expect.poll(() => frames.some((f) => f.startsWith('40'))).toBe(true)
  return { socket, frames }
}

const received = (frames: string[]): string[] =>
  frames.filter((f) => f.startsWith('42')).map((f) => (JSON.parse(f.slice(2)) as [string])[0])

describe('realtimeHandler', () => {
  it('token no auth do CONNECT recebe eventos do usuário; sem token ou inválido = visitante', async () => {
    const user = await connect({ token: TOKEN })
    const visitor = await connect(null)
    const invalid = await connect({ token: 'expirado' })

    emitEvent(orderEvent('user:user-001'))
    await expect.poll(() => received(user.frames)).toEqual(['order.updated'])
    expect(received(visitor.frames)).toEqual([])
    expect(received(invalid.frames)).toEqual([])

    emitEvent(orderEvent('public'))
    await expect.poll(() => received(visitor.frames)).toEqual(['order.updated'])
    expect(received(user.frames)).toHaveLength(2)
    ;[user, visitor, invalid].forEach(({ socket }) => socket.close())
  })

  it('realtimeDown fecha as conexões abertas e recusa novas', async () => {
    const { socket } = await connect(null)
    const closed = new Promise((resolve) =>
      socket.addEventListener('close', resolve, { once: true }),
    )
    setRealtimeDown(true)
    await closed
    const refused = new WebSocket(URL_WS)
    await new Promise((resolve) => refused.addEventListener('close', resolve, { once: true }))
    setRealtimeDown(false)
  })

  it('updateNft com edição inexistente não muta nem emite', async () => {
    const { socket, frames } = await connect(null)
    const before = getDb().nfts.find((n) => n.id === 'nft-003')
    updateNft({ nftId: 'nft-003', editionId: 'nao-existe', price: '9.99' })
    expect(getDb().nfts.find((n) => n.id === 'nft-003')).toEqual(before)
    expect(received(frames)).toEqual([])
    socket.close()
  })
})
