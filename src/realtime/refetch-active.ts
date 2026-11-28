import type { QueryClient } from '@tanstack/react-query'
import type { Scope } from '@/app/query-keys'

/**
 * Após reconectar, o REST é a verdade (ADR 0003): só consultas ativas são refeitas.
 * `scope` cobre carrinho, cotação e, para usuário, pedidos; `public` cobre catálogo e detalhe.
 */
export function refetchActiveResources(queryClient: QueryClient, scope: Scope): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [...scope], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['public'], refetchType: 'active' }),
  ]).then(() => undefined)
}
