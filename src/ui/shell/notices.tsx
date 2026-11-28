import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { noticeBus, type Notice } from '@/realtime/notices'
import { NOTICES_ATTR } from '@/ui/notices-region'

// Também em cada aviso: o Radix avalia o clique fora depois do `click`, quando "Dispensar"
// já removeu o aviso do contêiner; o próprio aviso desligado ainda é reconhecido.
const NOTICES_MARK = { [NOTICES_ATTR]: '' }

const LIVE = { status: 'polite', alert: 'assertive' } as const

function NoticeList({ items, role }: { items: readonly Notice[]; role: 'status' | 'alert' }) {
  // `aria-live` explícito: o `hideOthers` do modal (Radix) poupa só elementos com esse atributo.
  return (
    <div role={role} aria-live={LIVE[role]} className="pointer-events-none flex flex-col gap-2">
      {items.map((n) => (
        <div
          key={n.id}
          {...NOTICES_MARK}
          onMouseEnter={() => noticeBus.hold(n.id)}
          onMouseLeave={() => noticeBus.release(n.id)}
          onFocus={() => noticeBus.hold(n.id)}
          onBlur={() => noticeBus.release(n.id)}
          className="bg-background pointer-events-auto flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-md"
        >
          <span>{n.text}</span>
          <button
            type="button"
            onClick={() => noticeBus.dismiss(n.id)}
            aria-label="Dispensar aviso"
            className="rounded-sm px-1 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Portal em `document.body`: fora do `#root`, que o modal marca com `aria-hidden`. Fica acima
 * do overlay dos modais (z-50) para os avisos seguirem visíveis com o recibo ou o login abertos.
 */
export function Notices() {
  const all = useSyncExternalStore(noticeBus.subscribe, noticeBus.getSnapshot)
  return createPortal(
    <div
      {...NOTICES_MARK}
      className="fixed inset-x-4 bottom-[calc(1rem+var(--notices-offset,0px))] z-[60] flex flex-col gap-2 sm:left-auto sm:w-96 lg:bottom-4"
    >
      <NoticeList role="status" items={all.filter((n) => n.politeness === 'polite')} />
      <NoticeList role="alert" items={all.filter((n) => n.politeness === 'assertive')} />
    </div>,
    document.body,
  )
}
