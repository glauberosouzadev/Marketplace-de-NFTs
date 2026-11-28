/** Marca estável da região de avisos (portal em `document.body`, fora dos modais). */
export const NOTICES_ATTR = 'data-notices'

export function isInsideNotices(target: EventTarget | null): boolean {
  const element = target as Element | null
  return typeof element?.closest === 'function' && element.closest(`[${NOTICES_ATTR}]`) !== null
}

interface OutsideEvent {
  target: EventTarget | null
  preventDefault: () => void
}

/** Dispensar ou focar um aviso não é interação "fora" do modal: ele não fecha. */
export const keepOpenOnNotices =
  <E extends OutsideEvent>(handler?: (event: E) => void) =>
  (event: E): void => {
    if (isInsideNotices(event.target)) event.preventDefault()
    handler?.(event)
  }
