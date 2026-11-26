import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { env } from '@/app/env'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import '@/styles/globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root nao encontrado')

const app = createRoot(root)

async function bootstrap(): Promise<void> {
  if (env.enableMocks) {
    const { startMocks } = await import('@/mocks/browser')
    await startMocks()
  }
  // Só depois do start: o engine.io-client captura `WebSocket` ao carregar (SDD-13).
  const realtime = await import('@/realtime/socket')
  realtime.connectPersistedRealtime()
  if (env.enableMocks) realtime.exposeRealtimeForTests()

  app.render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  )
}

void bootstrap()
