import {
  Bell,
  Download,
  Heart,
  LogOut,
  MapPin,
  ShoppingBag,
  TriangleAlert,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useLogout } from '@/features/session/mutations'
import { cn } from '@/lib/cn'
import { OutOfScopeButton } from '@/ui/shell/out-of-scope'

const ITEM_CLASS =
  'text-primary focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset'

const OTHER_ITEMS: readonly { label: string; icon: LucideIcon }[] = [
  { label: 'Atividade', icon: ShoppingBag },
  { label: 'Lista de interesse', icon: Heart },
  { label: 'Ofertas', icon: Bell },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: TriangleAlert },
]

/** Menu lateral do perfil: só "Carteiras" é navegável; os demais itens são inertes (EPIC-05). */
export function ProfileMenu() {
  const logout = useLogout()
  const navigate = useNavigate()
  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => void navigate({ to: '/', replace: true }) })

  return (
    <nav aria-labelledby="profile-menu-title" className="bg-card">
      <h2 id="profile-menu-title" className="px-4 pt-4 pb-2 text-lg font-bold">
        Meu perfil
      </h2>
      <ul>
        <li>
          <OutOfScopeButton className={ITEM_CLASS}>
            <User aria-hidden className="size-4" />
            Dados do perfil
          </OutOfScopeButton>
        </li>
        <li>
          <span
            aria-current="page"
            className={cn(ITEM_CLASS, 'border-primary bg-secondary/40 border-l-4 pl-3')}
          >
            <MapPin aria-hidden className="size-4" />
            Carteiras
          </span>
        </li>
        {OTHER_ITEMS.map(({ label, icon: Icon }) => (
          <li key={label}>
            <OutOfScopeButton className={ITEM_CLASS}>
              <Icon aria-hidden className="size-4" />
              {label}
            </OutOfScopeButton>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={signOut}
        disabled={logout.isPending}
        className={cn(ITEM_CLASS, 'border-border border-t font-bold')}
      >
        <LogOut aria-hidden className="size-4" />
        Sair
      </button>
    </nav>
  )
}
