import { useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

/** Botão de voltar circular das telas sem tab bar (SDD-12); só abaixo de 1024 px. */
export function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => router.history.back()}
      className="grid size-10 place-items-center rounded-full bg-card text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
    >
      <ChevronLeft aria-hidden className="size-5" />
    </button>
  )
}
