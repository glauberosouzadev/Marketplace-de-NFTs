import { setupWorker } from 'msw/browser'
import { applyUrlParams, installMockControl } from './control'
import { getDb } from './db/store'
import { handlers } from './handlers'
import { activateScenario } from './scenarios/active'

const worker = setupWorker(...handlers)

export async function startMocks(): Promise<void> {
  applyUrlParams()
  activateScenario(getDb().meta.scenario)
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
  })
  installMockControl()
}
