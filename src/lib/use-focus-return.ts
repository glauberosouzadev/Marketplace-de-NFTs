import { useRef } from 'react'

/**
 * Rotas abrem o modal sem `DialogTrigger`: guarda quem tinha o foco na montagem e o devolve ao
 * fechar (SDD-12). `onCloseAutoFocus` vai direto no `DialogContent`.
 */
export function useFocusReturn(): (event: Event) => void {
  const opener = useRef<Element | null>(null)
  opener.current ??= document.activeElement
  return (event) => {
    const target = opener.current
    if (target instanceof HTMLElement && target.isConnected) {
      event.preventDefault()
      target.focus()
    }
  }
}
