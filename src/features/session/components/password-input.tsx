import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Input } from '@/ui/input'

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? Eye : EyeOff
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="text-text-muted-2 hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-3 my-auto flex size-6 items-center justify-center rounded-sm outline-none focus-visible:ring-2"
      >
        <Icon aria-hidden className="size-[18px]" />
      </button>
    </div>
  )
}
