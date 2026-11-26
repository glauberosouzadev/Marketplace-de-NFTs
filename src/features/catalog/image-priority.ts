interface FeaturedState {
  isPending: boolean
  isError: boolean
  data?: undefined | { items: readonly unknown[] }
}

/** O 1º card do grid só ganha `high` sem hero/carrossel (destaques em erro ou vazios); nunca no carregamento. */
export function shouldPrioritizeGrid({ isPending, isError, data }: FeaturedState): boolean {
  if (isPending) return false
  return isError || !data || data.items.length === 0
}
