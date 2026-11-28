import { BackButton } from '@/ui/shell/back-button'
import { OutOfScopeButton } from '@/ui/shell/out-of-scope'
import { useWallets } from '../queries'
import { ProfileMenu } from './profile-menu'
import { WalletForm } from './wallet-form'
import { WalletsError, WalletsSkeleton } from './wallets-states'

const LINK_BUTTON =
  'text-primary focus-visible:ring-ring text-sm font-bold outline-none focus-visible:ring-2'

function SecondaryWallet() {
  return (
    <section aria-labelledby="secondary-title" className="grid gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="secondary-title" className="text-lg font-bold">
          Carteira secundária
        </h2>
        <div className="flex items-center gap-3">
          <OutOfScopeButton className="focus-visible:ring-ring flex items-center gap-2 text-sm outline-none focus-visible:ring-2">
            <span aria-hidden className="border-primary size-4 rounded-full border-2" />
            Igual à carteira principal
          </OutOfScopeButton>
          <OutOfScopeButton className={LINK_BUTTON}>Adicionar</OutOfScopeButton>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">
        Você ainda não adicionou uma carteira secundária.
      </p>
    </section>
  )
}

export function WalletsPage({ uid, returnTo }: { uid: string; returnTo: string | undefined }) {
  const { data, isPending, refetch } = useWallets(uid)

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 pt-6 pb-10 lg:grid lg:flex-none lg:grid-cols-[336px_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:py-8">
      <h1 className="sr-only">Carteiras</h1>
      <div className="flex items-center lg:hidden">
        <BackButton />
      </div>
      <ProfileMenu />
      <div className="flex flex-col gap-10">
        <section aria-labelledby="primary-title" className="grid gap-6">
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-3">
              <h2 id="primary-title" className="text-lg font-bold">
                Carteira principal
              </h2>
              <OutOfScopeButton className={LINK_BUTTON}>Adicionar</OutOfScopeButton>
            </div>
            <p className="text-muted-foreground text-sm">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
            </p>
          </div>
          {isPending ? (
            <WalletsSkeleton />
          ) : data ? (
            <WalletForm uid={uid} wallet={data.primary} returnTo={returnTo} />
          ) : (
            <WalletsError onRetry={() => void refetch()} />
          )}
        </section>
        <SecondaryWallet />
      </div>
    </main>
  )
}
