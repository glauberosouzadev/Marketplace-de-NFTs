import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageWindow } from '../pagination'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

const base =
  'grid size-10 place-items-center rounded-full text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 md:rounded-md'

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-2 py-8">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={`${base} bg-card`}
      >
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`Página ${p}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={`${base} ${p === page ? 'bg-primary font-bold text-primary-foreground' : 'bg-card'}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Próxima página"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={`${base} bg-card`}
      >
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </nav>
  )
}
