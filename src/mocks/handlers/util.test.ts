import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activateScenario } from '../scenarios/active'
import { withScenario } from './util'

const server = setupServer(
  http.get(
    'http://x.test/ok',
    withScenario('GET /nfts', () => HttpResponse.json({ ok: true })),
  ),
)
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterAll(() => server.close())

describe('withScenario', () => {
  it('S-03: envelope 503 TRANSIENT nas primeiras, depois sucesso', async () => {
    activateScenario('S-03')
    for (let i = 0; i < 4; i++) {
      const res = await fetch('http://x.test/ok')
      expect(res.status).toBe(503)
      expect(await res.json()).toMatchObject({ code: 'TRANSIENT' })
    }
    expect((await fetch('http://x.test/ok')).status).toBe(200)
  })
  it('default: sucesso', async () => {
    activateScenario('default')
    expect((await fetch('http://x.test/ok')).status).toBe(200)
  })
})
