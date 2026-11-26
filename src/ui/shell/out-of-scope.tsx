import type { ButtonHTMLAttributes } from 'react'
import { noticeBus } from '@/realtime/notices'

export const OUT_OF_SCOPE_TEXT = 'Página não incluída nesta demonstração'

export function publishOutOfScope(): void {
  noticeBus.publish({ id: 'out-of-scope', politeness: 'polite', text: OUT_OF_SCOPE_TEXT })
}

/** Gatilho inerte: nunca navega nem simula sucesso, só anuncia o aviso. */
export function OutOfScopeButton({
  onClick,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      onClick={(event) => {
        onClick?.(event)
        publishOutOfScope()
      }}
      {...props}
    />
  )
}
