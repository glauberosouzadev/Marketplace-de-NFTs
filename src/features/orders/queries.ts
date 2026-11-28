import { queryOptions, useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/app/query-client'
import { queryKeys } from '@/app/query-keys'
import { getOrder } from '@/http/endpoints/orders'
import { useRestObserver } from '@/realtime/realtime-provider'
import type { RestObserver } from '@/realtime/realtime-sync'

/** Recebe só o necessário do reconciliador; a instância real vem de `useRestObserver`. */
export type OrderObserver = Pick<RestObserver, 'observeOrder'>

export const orderQuery = (uid: string, id: string, observer: OrderObserver) =>
  queryOptions({
    queryKey: queryKeys.order(uid, id),
    queryFn: async ({ signal }) => {
      const order = await getOrder(id, signal)
      observer.observeOrder(order)
      return order
    },
    staleTime: 0,
    retry: (count, error) => shouldRetry(count, error, 2),
  })

export const useOrder = (uid: string, id: string) =>
  useQuery(orderQuery(uid, id, useRestObserver()))
