import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, LogOut } from 'lucide-react'
import type { User } from '@/contracts'
import { useLogout } from '@/features/session/mutations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu'

/** Menu do usuário logado (Q-13): Perfil e Carteiras navegam (guard cuida do visitante); Sair faz o logout completo. */
export function UserMenu({ user }: { user: User }) {
  const logout = useLogout()
  const navigate = useNavigate()
  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => void navigate({ to: '/', replace: true }) })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu da conta de ${user.displayName}`}
        className="focus-visible:ring-ring bg-secondary flex h-[35px] max-w-[200px] items-center gap-2 rounded-md px-2 text-sm font-bold outline-none focus-visible:ring-2"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs"
          >
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="truncate">{user.displayName}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/perfil">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/carteiras">Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={logout.isPending}>
          <LogOut aria-hidden className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
