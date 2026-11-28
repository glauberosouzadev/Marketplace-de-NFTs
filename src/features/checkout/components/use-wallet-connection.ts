import { useReducer, useRef } from 'react'
import type { Network, WalletProvider } from '@/contracts'
import { useCreateWalletConnection, useDeleteWalletConnection } from '@/features/wallets/mutations'
import { errorMessage } from '@/http/error-messages'
import { isApiError } from '@/http/normalize-error'
import type { CheckoutDraft } from '../checkout-draft'
import type { CheckoutController } from '../use-checkout'
import { connectionReducer, initialConnection, type ConnectionState } from '../wallet-connection'

const DISCONNECTED: ConnectionState = { phase: 'disconnected' }

export interface ConnectionChoice {
  walletId?: string
  provider?: WalletProvider
  network?: Network
}

const failureText = (error: unknown): string =>
  errorMessage(isApiError(error) ? error.code : 'TRANSIENT')

/**
 * Conexão simulada da carteira escolhida (SDD-10). Trocar carteira, provedor ou rede
 * invalida a conexão; resultado de uma tentativa superada é descartado.
 */
export function useWalletConnection(
  uid: string,
  draft: CheckoutDraft,
  controller: CheckoutController,
) {
  const [state, dispatch] = useReducer(connectionReducer, draft.connectionId, initialConnection)
  const create = useCreateWalletConnection(uid)
  const remove = useDeleteWalletConnection(uid)
  const attempt = useRef(0)

  function choose(choice: ConnectionChoice): void {
    attempt.current += 1
    controller.updateFields({ ...choice, connectionId: undefined })
    dispatch({ type: 'RESET' })
  }

  async function connect(): Promise<void> {
    const { walletId, provider, network } = draft
    if (!walletId || !provider || !network) return
    const current = ++attempt.current
    dispatch({ type: 'START' })
    try {
      const connection = await create.mutateAsync({ walletId, provider, network })
      if (current !== attempt.current) return
      if (connection.status === 'connected') {
        controller.updateFields({ connectionId: connection.id })
        dispatch({ type: 'CONNECTED' })
      } else {
        controller.updateFields({ connectionId: undefined })
        dispatch({ type: connection.status === 'rejected' ? 'REJECTED' : 'DISCONNECTED' })
      }
    } catch (error) {
      if (current !== attempt.current) return
      controller.updateFields({ connectionId: undefined })
      dispatch({ type: 'FAILED', error: failureText(error) })
    }
  }

  async function disconnect(): Promise<void> {
    const { connectionId } = draft
    if (!connectionId) return
    const current = ++attempt.current
    try {
      await remove.mutateAsync(connectionId)
    } catch (error) {
      if (current === attempt.current) dispatch({ type: 'FAILED', error: failureText(error) })
      return
    }
    if (current !== attempt.current) return
    controller.updateFields({ connectionId: undefined })
    dispatch({ type: 'DISCONNECTED' })
  }

  // 409 WALLET_DISCONNECTED no envio remove a conexão do contexto (SDD-10).
  const visible = state.phase === 'connected' && !draft.connectionId ? DISCONNECTED : state

  return { state: visible, choose, connect, disconnect }
}
