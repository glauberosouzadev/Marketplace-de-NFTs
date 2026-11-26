import { request } from '@/http/client'
import { CATALOG_PAGE_SIZE } from '@/contracts'
import type {
  FacetsQuery,
  FacetsResponse,
  FeaturedResponse,
  GetNftResponse,
  ListNftsQuery,
  ListNftsResponse,
} from '@/contracts'

/** Serializa repetindo a chave (`collection=a&collection=b`), sem depender do Axios. */
export function toSearchParams(params: ListNftsQuery | FacetsQuery): URLSearchParams {
  const out = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => out.append(key, String(v)))
    else out.append(key, String(value))
  }
  return out
}

const withQuery = (path: string, params: ListNftsQuery | FacetsQuery): string => {
  const qs = toSearchParams(params).toString()
  return qs ? `${path}?${qs}` : path
}

export function getNfts(params: ListNftsQuery, signal: AbortSignal): Promise<ListNftsResponse> {
  return request<ListNftsResponse>({
    method: 'GET',
    url: withQuery('/nfts', { ...params, pageSize: params.pageSize ?? CATALOG_PAGE_SIZE }),
    signal,
  })
}

export function getFacets(params: FacetsQuery, signal: AbortSignal): Promise<FacetsResponse> {
  return request<FacetsResponse>({ method: 'GET', url: withQuery('/nfts/facets', params), signal })
}

export function getFeatured(signal: AbortSignal): Promise<FeaturedResponse> {
  return request<FeaturedResponse>({ method: 'GET', url: '/nfts/featured', signal })
}

export function getNft(id: string, signal: AbortSignal): Promise<GetNftResponse> {
  return request<GetNftResponse>({
    method: 'GET',
    url: `/nfts/${encodeURIComponent(id)}`,
    signal,
  })
}
