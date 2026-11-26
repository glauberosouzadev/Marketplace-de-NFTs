import type { MockControl } from '@/mocks/control'

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}
