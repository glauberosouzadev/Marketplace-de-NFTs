import { BackButton } from '@/ui/shell/back-button'
import { useProfile } from '../queries'
import { ProfileForm } from './profile-form'
import { ProfileMenu } from './profile-menu'
import { ProfileError, ProfileSkeleton } from './profile-states'

export function ProfilePage({ uid }: { uid: string }) {
  const { data, isPending, refetch } = useProfile(uid)

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 pt-6 pb-10 lg:grid lg:flex-none lg:grid-cols-[336px_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:py-8">
      <div className="flex items-center lg:hidden">
        <BackButton />
      </div>
      <ProfileMenu />
      <section aria-labelledby="profile-title" className="grid gap-6">
        <h1 id="profile-title" className="text-lg font-bold">
          Perfil do colecionador
        </h1>
        {isPending ? (
          <ProfileSkeleton />
        ) : data ? (
          <ProfileForm uid={uid} profile={data} />
        ) : (
          <ProfileError onRetry={() => void refetch()} />
        )}
      </section>
    </main>
  )
}
