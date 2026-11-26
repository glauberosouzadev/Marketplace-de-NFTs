export type NoticePoliteness = 'polite' | 'assertive'

export interface Notice {
  id: string
  politeness: NoticePoliteness
  text: string
}

type Listener = (notices: readonly Notice[]) => void

let notices: readonly Notice[] = []
const listeners = new Set<Listener>()

function emit(): void {
  listeners.forEach((l) => l(notices))
}

export const noticeBus = {
  /** Publica um aviso; mesmo `id` já exibido é ignorado. */
  publish(notice: Notice): void {
    if (notices.some((n) => n.id === notice.id)) return
    notices = [...notices, notice]
    emit()
  },
  dismiss(id: string): void {
    notices = notices.filter((n) => n.id !== id)
    emit()
  },
  getSnapshot: (): readonly Notice[] => notices,
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  clear(): void {
    notices = []
    emit()
  },
}
