import { useState } from 'react'
import type { NftImage } from '@/contracts'
import { cn } from '@/lib/cn'

const DETAIL_WIDTH = 450
const DETAIL_HEIGHT = 563

/** Imagem principal (a de detalhe, `images[1]`, quando existe) e miniaturas navegáveis por teclado. */
export function NftGallery({ images }: { images: readonly NftImage[] }) {
  const initial = images.length > 1 ? 1 : 0
  const [selected, setSelected] = useState(initial)
  const current = images[selected]
  if (!current) return null
  const isInitial = selected === initial

  return (
    <div className="flex flex-col gap-3">
      <img
        key={current.url}
        src={current.url}
        alt={current.alt}
        width={DETAIL_WIDTH}
        height={DETAIL_HEIGHT}
        fetchPriority={isInitial ? 'high' : undefined}
        loading={isInitial ? undefined : 'lazy'}
        className="aspect-[4/5] w-full rounded-xl object-cover lg:rounded-md"
      />
      {images.length > 1 && (
        <ul aria-label="Imagens do NFT" className="flex gap-3">
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                aria-pressed={index === selected}
                className={cn(
                  'block overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-md',
                  index === selected ? 'border-primary' : 'border-transparent',
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  width={64}
                  height={80}
                  loading="lazy"
                  className="aspect-[4/5] w-16 object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
