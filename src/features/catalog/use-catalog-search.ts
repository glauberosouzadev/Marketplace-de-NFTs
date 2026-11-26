import { useNavigate, useSearch } from '@tanstack/react-router'
import { catalogSearchSchema, patchSearch, type CatalogSearch } from '@/contracts'

/**
 * Estado de busca do catálogo, sempre lido da URL. Funciona em qualquer rota
 * (o cabeçalho existe fora do Início); toda alteração passa por patchSearch (RN-16).
 */
export function useCatalogSearch() {
  const raw = useSearch({ strict: false })
  const navigate = useNavigate()
  const search = catalogSearchSchema.parse(raw)
  const update = (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) =>
    void navigate({
      to: '/',
      // Lê a URL no disparo: um filtro alterado enquanto o debounce corria não é sobrescrito.
      search: (prev: unknown) => patchSearch(catalogSearchSchema.parse(prev), patch),
      replace: options?.replace ?? false,
    })
  return { search, update }
}
