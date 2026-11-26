/** Blur/Esc só gravam `q` quando o valor digitado difere do da URL. */
export function shouldWriteQuery(value: string, currentQ: string): boolean {
  return value !== currentQ
}
