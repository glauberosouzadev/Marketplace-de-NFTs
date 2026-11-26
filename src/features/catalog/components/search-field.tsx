import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/ui/input'
import { cn } from '@/lib/cn'
import { shouldWriteQuery } from '../query-write'
import { useCatalogSearch } from '../use-catalog-search'

const DEBOUNCE_MS = 300

interface SearchFieldProps {
  placeholder: string
  className?: string
  focusOnMount?: boolean
  onEscape?: () => void
}

/** Campo ligado ao parâmetro `q`: `replace` enquanto digita, `push` ao confirmar com Enter. */
export function SearchField({ placeholder, className, focusOnMount, onEscape }: SearchFieldProps) {
  const { search, update } = useCatalogSearch()
  const [draft, setDraft] = useState(search.q)
  const [seenQ, setSeenQ] = useState(search.q)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Voltar/avançar altera `q` na URL: o rascunho acompanha.
  if (search.q !== seenQ) {
    setSeenQ(search.q)
    setDraft(search.q)
  }

  const pending = useRef<string | null>(null)
  const current = useRef({ q: search.q, update })
  useEffect(() => {
    current.current = { q: search.q, update }
  })
  // Texto pendente só vale enquanto a URL não mudou por fora (voltar/avançar).
  useEffect(() => {
    pending.current = null
  }, [search.q])

  useEffect(() => {
    if (focusOnMount) input.current?.focus()
    return () => clearTimeout(timer.current)
  }, [focusOnMount])

  const commit = (value: string, replace: boolean) => {
    clearTimeout(timer.current)
    pending.current = null
    if (!shouldWriteQuery(value, current.current.q)) return
    current.current.update({ q: value }, { replace })
  }

  // Ao sair do campo (blur/Escape) só grava texto alterado e diferente do `q` da URL.
  const flush = () => {
    if (pending.current !== null) commit(pending.current, true)
  }

  const onChange = (value: string) => {
    setDraft(value)
    pending.current = value.trim()
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, DEBOUNCE_MS)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commit(draft.trim(), false)
    } else if (event.key === 'Escape') {
      flush()
      onEscape?.()
    }
  }

  return (
    <div role="search" className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary"
      />
      <Input
        type="search"
        aria-label="Buscar NFTs"
        placeholder={placeholder}
        value={draft}
        ref={input}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={flush}
        className="bg-card pl-11"
      />
    </div>
  )
}
