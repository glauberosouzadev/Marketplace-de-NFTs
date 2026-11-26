import { SearchIcon } from 'lucide-react'
import type { NftImage } from '@/contracts'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/ui/dialog'

export const ACTION_BUTTON_CLASS =
  'inline-flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground outline-none hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring md:rounded-md'

interface ImageZoomDialogProps {
  nftName: string
  image: NftImage
}

export function ImageZoomDialog({ nftName, image }: ImageZoomDialogProps) {
  return (
    <Dialog>
      <DialogTrigger className={ACTION_BUTTON_CLASS} aria-label={`Ampliar imagem de ${nftName}`}>
        <SearchIcon className="size-5" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{nftName}</DialogTitle>
        <DialogDescription className="sr-only">Imagem ampliada</DialogDescription>
        <img
          src={image.url}
          alt={image.alt}
          className="max-h-[80vh] w-full rounded-xl object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}
