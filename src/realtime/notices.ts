export type NoticePoliteness = 'polite' | 'assertive'

export interface Notice {
  id: string
  politeness: NoticePoliteness
  text: string
}

type Listener = (notices: readonly Notice[]) => void

/** Avisos `polite` somem sozinhos para não cobrir CTAs fixos; `assertive` ficam até fechar. */
export const POLITE_NOTICE_MS = 5000

let notices: readonly Notice[] = []
const listeners = new Set<Listener>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
/** Foco e hover seguram o aviso; o tempo recomeça quando nenhum dos dois resta. */
const holds = new Map<string, number>()

function stopTimer(id: string): void {
  clearTimeout(timers.get(id))
  timers.delete(id)
}

function startTimer(id: string): void {
  stopTimer(id)
  timers.set(
    id,
    setTimeout(() => noticeBus.dismiss(id), POLITE_NOTICE_MS),
  )
}

const isPolite = (id: string): boolean =>
  notices.some((n) => n.id === id && n.politeness === 'polite')

function emit(): void {
  listeners.forEach((l) => l(notices))
}

export const noticeBus = {
  /** Publica um aviso; mesmo `id` já exibido é ignorado. */
  publish(notice: Notice): void {
    if (notices.some((n) => n.id === notice.id)) return
    notices = [...notices, notice]
    if (notice.politeness === 'polite') startTimer(notice.id)
    emit()
  },
  dismiss(id: string): void {
    stopTimer(id)
    holds.delete(id)
    notices = notices.filter((n) => n.id !== id)
    emit()
  },
  hold(id: string): void {
    if (!notices.some((n) => n.id === id)) return
    holds.set(id, (holds.get(id) ?? 0) + 1)
    stopTimer(id)
  },
  release(id: string): void {
    const left = (holds.get(id) ?? 0) - 1
    if (left > 0) {
      holds.set(id, left)
      return
    }
    holds.delete(id)
    if (isPolite(id)) startTimer(id)
  },
  getSnapshot: (): readonly Notice[] => notices,
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  clear(): void {
    timers.forEach(clearTimeout)
    timers.clear()
    holds.clear()
    notices = []
    emit()
  },
}
