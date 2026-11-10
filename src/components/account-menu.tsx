import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import { logout } from '@/api/endpoints'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { emptyHomeSearch } from '@/features/catalog/home-page'
import { useSession } from '@/features/session'
import { setToken } from '@/lib/storage'
import { disconnectRealtime, refreshRealtime } from '@/realtime/client'

export function AccountMenu() {
  const { user } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  if (!user) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-full bg-amber px-3 text-sm font-semibold text-ink">
        <UserRound className="size-4" />
        {user.displayName.split(' ')[0]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void navigate({ to: '/conta/perfil' })}>Dados do perfil</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/conta/carteiras' })}>Carteiras</DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void logout().finally(() => {
              setToken(null)
              queryClient.removeQueries({ predicate: (query) => !['nfts', 'nft'].includes(String(query.queryKey[0])) })
              disconnectRealtime()
              void refreshRealtime(queryClient)
              void navigate({ to: '/', search: emptyHomeSearch })
            })
          }}
        >
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
