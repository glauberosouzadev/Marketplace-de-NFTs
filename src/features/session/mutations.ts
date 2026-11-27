import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { AuthResponse, CartAdjustment, LoginRequest, Nft, RegisterRequest } from '@/contracts'
import { login, logout, register } from '@/http/endpoints/auth'
import {
  clearGuestCartId,
  clearOtherUsersStorage,
  clearSession,
  getGuestCartId,
  getSession,
  setSession,
} from '@/lib/storage'
import { noticeBus } from '@/realtime/notices'
import { usePrivateStateCleaner } from './clear-private-state'
import { mergeNoticeText } from './merge-notice'

export type LoginInput = Omit<LoginRequest, 'guestCartId'>
export type RegisterInput = Omit<RegisterRequest, 'guestCartId'>

/** Limpeza completa do estado privado (0029), injetada para não duplicar a lógica. */
export type PrivateStateCleaner = (uid: string | null) => void | Promise<void>

function announceMerge(client: QueryClient, adjustments: readonly CartAdjustment[]): void {
  const text = mergeNoticeText(
    adjustments,
    (nftId) => client.getQueryData<Nft>(queryKeys.nft(nftId))?.name,
  )
  if (text) noticeBus.publish({ id: `merge:${crypto.randomUUID()}`, politeness: 'polite', text })
}

/** Só `{token, uid}` vai ao armazenamento; a senha fica apenas nas variáveis da mutation. */
function authMutation<TInput>(
  client: QueryClient,
  call: (body: TInput & { guestCartId: string }) => Promise<AuthResponse>,
) {
  return {
    mutationFn: (input: TInput): Promise<AuthResponse> =>
      call({ ...input, guestCartId: getGuestCartId() }),
    retry: 0,
    onSuccess: async (data: AuthResponse) => {
      const uid = data.user.id
      const guestCartId = getGuestCartId()
      setSession({ token: data.session.token, uid })
      clearGuestCartId()
      clearOtherUsersStorage(uid)
      client.removeQueries({ queryKey: ['guest', guestCartId] })
      // Uma busca de sessão em andamento sobrescreveria o usuário recém-gravado.
      await client.cancelQueries({ queryKey: queryKeys.session() })
      client.setQueryData(queryKeys.session(), data.user)
      announceMerge(client, data.cartAdjustments)
      return client.invalidateQueries({ queryKey: queryKeys.cart(['user', uid]) })
    },
  }
}

export const loginMutation = (client: QueryClient) => authMutation<LoginInput>(client, login)
export const registerMutation = (client: QueryClient) =>
  authMutation<RegisterInput>(client, register)

/** Idempotente: falha da API não impede a limpeza local (FR-43). */
export const logoutMutation = (client: QueryClient, clearPrivateState: PrivateStateCleaner) => ({
  mutationFn: async (): Promise<void> => {
    const uid = getSession()?.uid ?? null
    try {
      await logout()
    } catch {
      // segue com a limpeza local
    }
    clearSession()
    await client.cancelQueries({ queryKey: queryKeys.session() })
    client.setQueryData(queryKeys.session(), null)
    try {
      await clearPrivateState(uid)
    } catch {
      // sessão local já encerrada; o logout segue idempotente
    }
  },
  retry: 0,
})

export const useLogin = () => useMutation(loginMutation(useQueryClient()))
export const useRegister = () => useMutation(registerMutation(useQueryClient()))
export const useLogout = () =>
  useMutation(logoutMutation(useQueryClient(), usePrivateStateCleaner()))
