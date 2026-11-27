import { useSyncExternalStore } from 'react'
import { noticeBus, type Notice } from '@/realtime/notices'

function NoticeList({ items, role }: { items: readonly Notice[]; role: 'status' | 'alert' }) {
  return (
    <div role={role} className="pointer-events-none flex flex-col gap-2">
      {items.map((n) => (
        <div
          key={n.id}
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

export function Notices() {
  const all = useSyncExternalStore(noticeBus.subscribe, noticeBus.getSnapshot)
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96">
      <NoticeList role="status" items={all.filter((n) => n.politeness === 'polite')} />
      <NoticeList role="alert" items={all.filter((n) => n.politeness === 'assertive')} />
    </div>
  )
}
