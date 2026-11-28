import { Skeleton } from '@/ui/skeleton'

export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando perfil"
      className="grid gap-x-8 gap-y-5 md:grid-cols-2"
    >
      {Array.from({ length: 5 }, (_, key) => (
        <Skeleton key={key} className="h-[74px] rounded-md" />
      ))}
    </div>
  )
}

export function ProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-6 py-16 text-center">
      <h2 className="text-xl font-bold">Não foi possível carregar seu perfil</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Houve um problema de conexão ou do servidor. Tente novamente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-[45px] items-center rounded-md px-8 text-sm font-bold outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        Tentar novamente
      </button>
    </div>
  )
}
