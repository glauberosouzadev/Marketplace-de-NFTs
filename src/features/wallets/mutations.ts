import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { CreateWalletConnectionRequest, UpsertWalletRequest, WalletSlot } from '@/contracts'
import {
  createWalletConnection,
  deleteWalletConnection,
  upsertWallet,
} from '@/http/endpoints/wallets'

export interface UpsertWalletVars {
  slot: WalletSlot
  body: UpsertWalletRequest
}

/** Sem retry; sucesso invalida as carteiras do usuário (SDD-06). */
function walletsMutation<TVars, TData>(
  client: QueryClient,
  uid: string,
  mutationFn: (vars: TVars) => Promise<TData>,
) {
  return {
    mutationFn,
    retry: 0,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.wallets(uid) }),
  }
}

export const upsertWalletMutation = (client: QueryClient, uid: string) =>
  walletsMutation(client, uid, ({ slot, body }: UpsertWalletVars) => upsertWallet(slot, body))

export const createWalletConnectionMutation = (client: QueryClient, uid: string) =>
  walletsMutation(client, uid, (body: CreateWalletConnectionRequest) =>
    createWalletConnection(body),
  )

export const deleteWalletConnectionMutation = (client: QueryClient, uid: string) =>
  walletsMutation(client, uid, (connectionId: string) => deleteWalletConnection(connectionId))

export const useUpsertWallet = (uid: string) =>
  useMutation(upsertWalletMutation(useQueryClient(), uid))
export const useCreateWalletConnection = (uid: string) =>
  useMutation(createWalletConnectionMutation(useQueryClient(), uid))
export const useDeleteWalletConnection = (uid: string) =>
  useMutation(deleteWalletConnectionMutation(useQueryClient(), uid))
