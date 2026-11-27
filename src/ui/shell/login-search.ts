import { safeRedirect } from '@/contracts/search'

const AUTH_PATH = /^\/(login|cadastro)(?=[/?#]|$)/

/** Nas próprias telas de auth não repassa `redirect` (evita laço); `/` é o padrão e fica fora da URL. */
export function loginSearch(href: string): { redirect?: string } {
  const redirect = safeRedirect(href)
  return redirect === '/' || AUTH_PATH.test(redirect) ? {} : { redirect }
}
