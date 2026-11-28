import { useEffect, type RefObject } from 'react'

/** Lida por `<Notices>`: altura da barra fixa inferior da tela atual (mobile). */
export const NOTICES_OFFSET_VAR = '--notices-offset'

/** Mantém os avisos acima de uma barra fixa no rodapé enquanto ela estiver montada. */
export function useNoticesOffset(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    const root = document.documentElement
    const observer = new ResizeObserver(() =>
      root.style.setProperty(NOTICES_OFFSET_VAR, `${bar.offsetHeight}px`),
    )
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty(NOTICES_OFFSET_VAR)
    }
  }, [ref])
}
