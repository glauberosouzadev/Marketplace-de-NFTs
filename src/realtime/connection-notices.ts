import type { ConnectionListener } from './connection-status'
import type { Notice } from './notices'

const RECONNECTING: Notice = {
  id: 'realtime:reconnecting',
  politeness: 'polite',
  text: 'Reconectando…',
}
const RECONNECTED: Notice = {
  id: 'realtime:reconnected',
  politeness: 'polite',
  text: 'Reconectado',
}
const RECONNECTED_VISIBLE_MS = 3000

export interface ConnectionNoticesDeps {
  notices: { publish: (notice: Notice) => void; dismiss: (id: string) => void }
  onReconnected: () => void
}

/** Só queda seguida de reconexão avisa "Reconectado"; a primeira conexão é silenciosa. */
export function createConnectionNotices({ notices, onReconnected }: ConnectionNoticesDeps): {
  listener: ConnectionListener
  dispose: () => void
} {
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  const clearHideTimer = () => clearTimeout(hideTimer)

  const hideAll = () => {
    clearHideTimer()
    notices.dismiss(RECONNECTING.id)
    notices.dismiss(RECONNECTED.id)
  }

  const listener: ConnectionListener = (next, previous) => {
    if (next === 'reconnecting') {
      clearHideTimer()
      notices.dismiss(RECONNECTED.id)
      notices.publish(RECONNECTING)
    } else if (next === 'connected' && previous === 'reconnecting') {
      notices.dismiss(RECONNECTING.id)
      notices.publish(RECONNECTED)
      clearHideTimer()
      hideTimer = setTimeout(() => notices.dismiss(RECONNECTED.id), RECONNECTED_VISIBLE_MS)
      onReconnected()
    } else if (next === 'idle' || next === 'connecting') {
      hideAll()
    }
  }

  return { listener, dispose: hideAll }
}
