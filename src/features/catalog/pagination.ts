/** Página fora do intervalo volta para a última existente; `null` quando não há correção. */
export function clampPage(page: number, totalPages: number): number | null {
  const last = Math.max(totalPages, 1)
  return page > last ? last : null
}

/** Números de página a exibir: janela ao redor da atual, com reticências (`null`). */
export function pageWindow(current: number, total: number): Array<number | null> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - (sorted[i - 1] as number) > 1 ? [null, p] : [p]))
}

/** Vazio só vale sem correção de página pendente (página fora do intervalo traz `items` vazio). */
export function shouldShowEmpty(itemCount: number, correctedPage: number | null): boolean {
  return itemCount === 0 && correctedPage === null
}
