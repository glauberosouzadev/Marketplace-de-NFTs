/** Índice circular do carrossel; `count` zero mantém 0. */
export function stepIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return 0
  return (((current + delta) % count) + count) % count
}
