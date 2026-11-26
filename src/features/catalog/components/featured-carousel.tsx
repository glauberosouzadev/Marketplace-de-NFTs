import { useState, type KeyboardEvent } from 'react'
import type { NftSummary } from '@/contracts'
import { stepIndex } from '../carousel-index'

interface FeaturedCarouselProps {
  items: NftSummary[]
  onExplore: () => void
}

/** Carrossel mobile; só troca de slide por ação do usuário (sem autoplay). */
export function FeaturedCarousel({ items, onExplore }: FeaturedCarouselProps) {
  const [index, setIndex] = useState(0)
  const count = items.length
  const current = Math.min(index, Math.max(count - 1, 0))
  const main = items[current]?.images[0]
  const secondary = count > 1 ? items[stepIndex(current, 1, count)]?.images[0] : undefined

  // Setas nos indicadores (botões): trocam o slide e movem o foco junto.
  const onDotKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = stepIndex(current, delta, count)
    setIndex(next)
    ;(e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus()
  }

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="bg-card relative mb-6 flex h-[240px] items-stretch gap-3 overflow-hidden rounded-3xl px-4 pt-4 pb-8"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs">Bem-vindo à Kurio</p>
        <h1 className="mt-2 text-xl leading-7 font-bold uppercase">SEJA DONO DA CULTURA DIGITAL</h1>
        <p className="text-muted-foreground mt-2 text-xs">
          Descubra NFTs selecionados de criadores do mundo todo.
        </p>
        <button
          type="button"
          onClick={onExplore}
          className="text-primary focus-visible:ring-ring mt-auto self-start rounded-sm text-xs font-bold outline-none focus-visible:ring-2"
        >
          EXPLORAR →
        </button>
      </div>
      <div className="relative w-[120px] shrink-0">
        {main && (
          <img
            src={main.url}
            alt={main.alt}
            width={120}
            height={120}
            loading={current === 0 ? 'eager' : 'lazy'}
            {...(current === 0 ? { fetchPriority: 'high' as const } : {})}
            className="size-[120px] rounded-2xl object-cover"
          />
        )}
        {secondary && (
          <img
            src={secondary.url}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            className="border-card absolute bottom-0 left-[-20px] size-12 rounded-xl border-2 object-cover"
          />
        )}
      </div>
      {count > 1 && (
        <div className="absolute right-4 bottom-2 left-4 flex justify-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Destaque ${i + 1} de ${count}`}
              aria-current={i === current ? 'true' : undefined}
              onClick={() => setIndex(i)}
              onKeyDown={onDotKeyDown}
              className="focus-visible:ring-ring flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2"
            >
              <span className={`size-2 rounded-full ${i === current ? 'bg-primary' : 'bg-primary/40'}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
