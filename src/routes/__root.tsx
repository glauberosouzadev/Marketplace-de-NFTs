import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Notices } from '@/ui/shell/notices'

function NotFound() {
  return (
    <main className="p-8">
      <h1>Página não encontrada</h1>
    </main>
  )
}

function Root() {
  return (
    <>
      <Outlet />
      <Notices />
    </>
  )
}

export const Route = createRootRoute({ component: Root, notFoundComponent: NotFound })
