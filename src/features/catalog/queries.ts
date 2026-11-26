import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { FacetsQuery, ListNftsQuery } from '@/contracts'
import { getFacets, getFeatured, getNfts } from '@/http/endpoints/nfts'

export const nftsQuery = (params: ListNftsQuery) =>
  queryOptions({
    queryKey: queryKeys.nfts(params),
    queryFn: ({ signal }) => getNfts(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const facetsQuery = (params: FacetsQuery) =>
  queryOptions({
    queryKey: queryKeys.facets(params),
    queryFn: ({ signal }) => getFacets(params, signal),
    staleTime: 60_000,
  })

export const featuredQuery = () =>
  queryOptions({
    queryKey: queryKeys.featured(),
    queryFn: ({ signal }) => getFeatured(signal),
    staleTime: 60_000,
  })

export const useNfts = (params: ListNftsQuery) => useQuery(nftsQuery(params))
export const useFacets = (params: FacetsQuery) => useQuery(facetsQuery(params))
export const useFeatured = () => useQuery(featuredQuery())
