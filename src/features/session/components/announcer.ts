/** Limpa e repõe o texto no próximo tick: o leitor de tela reanuncia mesmo com o texto repetido. */
export function createAnnouncer(setText: (text: string) => void, delayMs = 50) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    announce(text: string): void {
      clearTimeout(timer)
      setText('')
      timer = setTimeout(() => setText(text), delayMs)
    },
    cancel(): void {
      clearTimeout(timer)
    },
  }
}
