import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '@/api/endpoints'
import { emptyHomeSearch } from '@/features/catalog/home-page'
import { useUnavailable } from '@/components/shell'
import { setToken } from '@/lib/storage'
import { refreshRealtime } from '@/realtime/client'

const items = [
  { to: '/conta/perfil', label: 'Dados do perfil' },
  { to: '/conta/carteiras', label: 'Carteiras' },
] as const

const unavailable = ['Atividade', 'Lista de interesse', 'Ofertas', 'Arquivos baixados', 'Suporte']

export function AccountNav() {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const open = useUnavailable()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return (
    <aside className="h-fit rounded-xl bg-panel p-4 md:w-64">
      <h2 className="mb-3 font-semibold">Meu perfil</h2>
      <nav className="space-y-1" aria-label="Conta">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={`block rounded-md px-3 py-2 text-sm ${path === item.to ? 'bg-ink text-amber' : 'text-gold-2'}`}>
            {item.label}
          </Link>
        ))}
        {unavailable.map((item) => (
          <button key={item} type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-gold-2" onClick={() => open(item)}>
            {item}
          </button>
        ))}
        <button
          type="button"
          className="block w-full rounded-md px-3 py-2 text-left text-sm"
          onClick={() => {
            void logout().finally(() => {
              setToken(null)
              queryClient.clear()
              void refreshRealtime(queryClient)
              void navigate({ to: '/', search: emptyHomeSearch })
            })
          }}
        >
          Sair
        </button>
      </nav>
    </aside>
  )
}
