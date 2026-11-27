import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-background text-foreground placeholder:text-text-muted-2 focus-visible:border-primary focus-visible:ring-ring focus-visible:ring-offset-background aria-invalid:border-destructive h-[50px] w-full min-w-0 rounded-xl border px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 lg:h-10 lg:rounded-md',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
