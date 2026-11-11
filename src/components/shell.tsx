import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Home, LogOut, Menu, Search, ShoppingBag, UserRound } from 'lucide-react'
import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { fetchCart } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const UnavailableDialog = lazy(() => import('@/components/shell-dialogs').then((module) => ({ default: module.UnavailableDialog })))
const SearchDialog = lazy(() => import('@/components/shell-dialogs').then((module) => ({ default: module.SearchDialog })))
const AccountMenu = lazy(() => import('@/components/account-menu').then((module) => ({ default: module.AccountMenu })))
import { emptyHomeSearch } from '@/features/catalog/home-page'
import { useSession } from '@/features/session'
import { getGuestId } from '@/lib/storage'
import { refreshRealtime } from '@/realtime/client'

const nav = [
  { to: '/', label: 'Início', hash: '' },
  { to: '/', label: 'Mercado', hash: 'catalogo' },
  { to: '/indisponivel', label: 'Criadores', topic: 'Criadores' },
  { to: '/indisponivel', label: 'Aprenda', topic: 'Aprenda' },
] as const

const UnavailableContext = createContext<(topic: string) => void>(() => undefined)

export function useUnavailable() {
  return useContext(UnavailableContext)
}

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const desktopAuth = path === '/entrar' || path === '/cadastro'
  const [topic, setTopic] = useState<string | null>(null)
  const showMobileHome = path === '/'
  return (
    <UnavailableContext.Provider value={setTopic}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-amber focus:p-3 focus:text-ink">
        Pular para o conteúdo
      </a>
      <div className={desktopAuth ? 'hidden md:block' : showMobileHome ? 'block' : 'hidden md:block'}>
        <SiteHeader onUnavailable={setTopic} />
      </div>
      <main id="conteudo" className="min-h-[100svh]">{children}</main>
      <div className="hidden md:block">
        <SiteFooter onUnavailable={setTopic} />
      </div>
      {showMobileHome ? <MobileBar /> : null}
      {topic ? (
        <Suspense fallback={null}>
          <UnavailableDialog topic={topic} onClose={() => setTopic(null)} />
        </Suspense>
      ) : null}
      <div id="live-region" className="sr-only" aria-live="polite" aria-atomic="true" />
    </UnavailableContext.Provider>
  )
}

function SiteHeader({ onUnavailable }: { onUnavailable: (topic: string) => void }) {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const { user } = useSession()
  const owner = user?.id ?? getGuestId()
  const cart = useQuery({ queryKey: ['cart', owner], queryFn: ({ signal }) => fetchCart(signal) })
  const count = (cart.data ?? []).reduce((sum, item) => sum + item.quantity, 0)
  const seenCount = useRef<number | null>(null)
  const [pulseCart, setPulseCart] = useState(false)
  useEffect(() => {
    if (seenCount.current === null) {
      seenCount.current = count
      return
    }
    if (seenCount.current === count) return
    seenCount.current = count
    setPulseCart(true)
    const timer = window.setTimeout(() => setPulseCart(false), 360)
    return () => window.clearTimeout(timer)
  }, [count])
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useEffect(() => {
    const onExpired = () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'nfts' && query.queryKey[0] !== 'nft' })
      void refreshRealtime(queryClient)
      const redirect = `${window.location.pathname}${window.location.search}`
      toast.message('Sua sessão expirou. Entre novamente para continuar.')
      void navigate({ to: '/entrar', search: { redirect } })
    }
    window.addEventListener('kurio-unauthorized', onExpired)
    return () => window.removeEventListener('kurio-unauthorized', onExpired)
  }, [navigate, queryClient])

  return (
    <header className="border-b border-line/70">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-4 px-4 md:px-8">
        <Link to="/" search={emptyHomeSearch} className="motion-press font-display text-xl tracking-[0.18em] text-cream">
          KURIO
        </Link>
        <nav className="mx-auto hidden items-center gap-7 md:flex" aria-label="Principal">
          {nav.map((item) =>
            'topic' in item ? (
              <button key={item.label} type="button" className="motion-press text-sm text-gold-2 hover:text-cream" onClick={() => onUnavailable(item.topic)}>
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                to="/"
                search={emptyHomeSearch}
                hash={item.hash || undefined}
                className={`motion-press text-sm ${path === '/' && item.label === 'Início' ? 'text-cream' : 'text-gold-2 hover:text-cream'}`}
                activeOptions={{ exact: true, includeHash: false }}
              >
                <span className={path === '/' && item.label === 'Início' ? 'border-b-2 border-amber pb-1' : ''}>{item.label}</span>
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="motion-press hidden size-10 items-center justify-center text-cream md:inline-flex" aria-label="Buscar coleções" onClick={() => setSearchOpen(true)}>
            <Search className="size-5" />
          </button>
          <Link to="/carrinho" className="motion-press relative inline-flex size-10 items-center justify-center" aria-label={`Carrinho, ${count} itens`}>
            <ShoppingBag className="size-5" />
            <span className={`absolute top-1 right-0 min-w-4 rounded-full bg-amber px-1 text-center text-[10px] font-bold text-ink ${pulseCart ? 'motion-pop' : ''}`}>{count}</span>
          </Link>
          {user ? (
            <Suspense fallback={<span className="inline-flex h-10 items-center rounded-full bg-amber px-3 text-sm font-semibold text-ink">{user.displayName.split(' ')[0]}</span>}>
              <AccountMenu />
            </Suspense>
          ) : (
            <Link to="/entrar" search={{ redirect: path }} className="inline-flex h-10 items-center gap-2 rounded-full bg-amber px-4 text-sm font-semibold text-ink">
              <LogOut className="size-4 rotate-180" />
              Entrar
            </Link>
          )}
        </div>
      </div>
      {searchOpen ? (
        <Suspense fallback={null}>
          <SearchDialog onClose={() => setSearchOpen(false)} />
        </Suspense>
      ) : null}
    </header>
  )
}

function MobileBar() {
  const { user } = useSession()
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-full border border-line bg-panel/95 px-2 py-2 backdrop-blur md:hidden" aria-label="Navegação móvel">
      <Link to="/" search={emptyHomeSearch} aria-label="Início" className="p-2 text-amber"><Home className="size-5" /></Link>
      <Link to="/" search={emptyHomeSearch} aria-label="Favoritos" className="p-2 text-gold-2" onClick={(event) => { if (!user) { event.preventDefault(); window.location.assign('/entrar?redirect=/') } }}>
        <Heart className="size-5" />
      </Link>
      <Link to="/carrinho" aria-label="Carrinho" className="p-2 text-gold-2"><ShoppingBag className="size-5" /></Link>
      <Link to={user ? '/conta/perfil' : '/entrar'} search={user ? undefined : { redirect: '/' }} aria-label="Conta" className="p-2 text-gold-2"><UserRound className="size-5" /></Link>
    </nav>
  )
}

export function MobileSearch() {
  const navigate = useNavigate()
  const search = useRouterState({ select: (state) => state.location.search as { q?: string } })
  const [filtersOpen, setFiltersOpen] = useState(false)
  return { filtersOpen, setFiltersOpen, node: (
    <div className="flex gap-2 md:hidden">
      <form
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          void navigate({ to: '/', search: { ...emptyHomeSearch, q: String(data.get('q') ?? ''), page: 1 } })
        }}
      >
        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-gold" />
        <Input name="q" defaultValue={search.q ?? ''} aria-label="Explorar coleções" placeholder="Explorar coleções" className="pl-10" />
      </form>
      <Button type="button" variant="outline" size="icon" aria-label="Abrir filtros" onClick={() => setFiltersOpen(true)}>
        <Menu className="size-4" />
      </Button>
    </div>
  ) }
}

function SiteFooter({ onUnavailable }: { onUnavailable: (topic: string) => void }) {
  const columns = [
    { title: 'Meu perfil', links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
    { title: 'Central de ajuda', links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'] },
    { title: 'Coleções', links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'] },
  ]
  return (
    <footer className="mx-auto mt-16 max-w-[1200px] px-4 pb-16 md:px-8">
      <section className="grid gap-6 rounded-xl bg-panel p-6 md:grid-cols-4" aria-label="Serviços">
        {[
          ['W', 'Segurança da carteira', 'Proteja sua carteira e colecione arte digital verificada com confiança.'],
          ['C', 'Criadores em destaque', 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.'],
          ['D', 'Alertas de lançamentos', 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.'],
        ].map(([mark, title, text]) => (
          <button key={title} type="button" className="text-left" onClick={() => onUnavailable(title)}>
            <span className="mb-3 grid size-12 place-items-center rounded-full bg-amber font-display text-ink">{mark}</span>
            <span className="block font-semibold">{title}</span>
            <span className="mt-2 block text-sm text-gold-2">{text}</span>
          </button>
        ))}
        <form
          className="text-left"
          onSubmit={(event) => {
            event.preventDefault()
            onUnavailable('Alertas de lançamento')
          }}
        >
          <p className="font-semibold">Antecipe-se ao próximo lançamento</p>
          <div className="mt-3 flex gap-2">
            <Input type="email" required aria-label="E-mail para alertas" placeholder="digite seu e-mail..." />
            <Button type="submit">Enviar</Button>
          </div>
          <p className="mt-2 text-sm text-gold-2">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
        </form>
      </section>
      <div className="mt-4 grid gap-2 bg-[#3a2418] px-4 py-4 text-sm text-gold-2 md:grid-cols-4">
        <p className="text-cream">KURIO</p>
        <p>Feito para colecionadores, criadores e cultura</p>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <a href="tel:+551140028922">+55 11 4002 8922</a>
      </div>
      <div className="grid gap-6 px-4 py-8 md:grid-cols-4">
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="mb-3 text-sm font-semibold">{column.title}</h2>
            <ul className="space-y-2 text-sm text-gold-2">
              {column.links.map((link) => (
                <li key={link}>
                  <button type="button" className="hover:text-cream" onClick={() => onUnavailable(link)}>{link}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="mb-3 text-sm font-semibold">Redes sociais</h2>
          <div className="flex gap-2 text-sm">
            {['Facebook', 'Instagram', 'X', 'LinkedIn', 'YouTube'].map((name) => (
              <button key={name} type="button" className="grid size-8 place-items-center rounded-full border border-line" aria-label={name} onClick={() => onUnavailable(name)}>
                {name.slice(0, 1)}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold">Carteiras compatíveis</p>
          <p className="mt-2 text-xs tracking-wide text-gold">METAMASK · WALLETCONNECT · COINBASE</p>
        </div>
      </div>
      <p className="text-center text-xs text-gold">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

export function BackBar({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-4 md:hidden">
      <button type="button" className="grid size-9 place-items-center rounded-full border border-line" aria-label="Voltar" onClick={() => window.history.length > 1 ? window.history.back() : void navigate({ to: '/', search: emptyHomeSearch })}>
        ‹
      </button>
      <h1 className="text-base font-semibold">{title}</h1>
    </div>
  )
}
