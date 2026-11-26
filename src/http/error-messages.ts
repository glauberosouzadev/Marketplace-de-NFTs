import type { ErrorCode } from '@/contracts'

const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: 'Revise os campos destacados e tente novamente.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente para continuar.',
  UNAUTHENTICATED: 'Entre na sua conta para continuar.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  FORBIDDEN: 'Você não tem permissão para esta ação.',
  NOT_FOUND: 'Não encontramos o que você procura.',
  AVAILABILITY_CONFLICT: 'Este item não está mais disponível na quantidade pedida.',
  EMAIL_TAKEN: 'Este e-mail já está em uso.',
  USERNAME_TAKEN: 'Este nome de usuário já está em uso.',
  QUOTE_STALE: 'Os valores mudaram. Revise o resumo e confirme novamente.',
  IDEMPOTENCY_CONFLICT: 'Este pedido já foi enviado com outros dados.',
  WALLET_DISCONNECTED: 'Sua carteira foi desconectada. Conecte-a novamente.',
  COUPON_INVALID: 'Cupom inválido.',
  COUPON_EXPIRED: 'Este cupom expirou.',
  TRANSIENT: 'Algo deu errado. Tente novamente.',
}

const ERROR_CODES = new Set<string>(Object.keys(MESSAGES))

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && ERROR_CODES.has(value)
}

/** Tabela única de mensagens em pt-BR (TSD-10). */
export function errorMessage(code: ErrorCode): string {
  return MESSAGES[code]
}
