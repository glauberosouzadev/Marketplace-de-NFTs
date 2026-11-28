import { useRouter } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import type { NftSummary } from '@/contracts'
import { loginHref } from '@/contracts/search'
import { useSession } from '@/features/session/queries'
import { cn } from '@/lib/cn'
import { useIsFavorite } from '../queries'
import { useToggleFavorite } from '../mutations'

export type FavoriteClick = { kind: 'login'; href: string } | { kind: 'toggle'; favorite: boolean }

export function resolveFavoriteClick(
  uid: string | undefined,
  favorite: boolean,
  currentHref: string,
): FavoriteClick {
  return uid
    ? { kind: 'toggle', favorite: !favorite }
    : { kind: 'login', href: loginHref(currentHref) }
}

interface FavoriteButtonProps {
  nft: NftSummary
  className?: string
}

/** Visitante vai ao login e volta à página atual; nada é gravado antes (FR-14). */
export function FavoriteButton({ nft, className }: FavoriteButtonProps) {
  const router = useRouter()
  const uid = useSession().data?.id
  const favorite = useIsFavorite(nft.id)
  const toggle = useToggleFavorite(uid ?? '')

  const onClick = () => {
    const click = resolveFavoriteClick(uid, favorite, router.state.location.href)
    if (click.kind === 'login') void router.navigate({ href: click.href })
    else toggle.mutate({ nft, favorite: click.favorite })
  }

  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
      onClick={onClick}
      className={cn(
        'bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 md:rounded-md',
        className,
      )}
    >
      <HeartIcon className={cn('size-5', favorite && 'fill-current')} aria-hidden="true" />
    </button>
  )
}
