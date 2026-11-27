import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Footer } from '@/ui/shell/footer'
import { Header } from '@/ui/shell/header'
import { NotFound } from '@/ui/shell/not-found'
import { Notices } from '@/ui/shell/notices'

function Root() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <Header />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <Footer />
      <Notices />
    </div>
  )
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: NotFound,
})
