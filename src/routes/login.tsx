import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router'
import { authSearchSchema, type AuthSearch } from '@/contracts'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { AuthShell } from '@/features/session/components/auth-shell'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Partial<AuthSearch> & SearchSchemaInput): AuthSearch =>
    authSearchSchema.parse(search),
  component: () => <AuthShell mode="login" background={<CatalogPage />} />,
})
