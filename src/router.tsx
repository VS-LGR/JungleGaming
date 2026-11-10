import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, redirect, RouterProvider } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import { Toaster } from 'sonner'
import { readError } from '@/api/client'
import { Shell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { categories, networks, sorts, tabs, type CategoryId, type EditionId, type NetworkId, type SortId, type TabId } from '@/contracts/types'
import { emptyHomeSearch, HomePage, type HomeSearch } from '@/features/catalog/home-page'
import { DetailPage, type DetailSearch } from '@/features/nft/detail-page'
import { getToken } from '@/lib/storage'
import { mswReady } from '@/msw-ready'
import { connectRealtime } from '@/realtime/client'

const AuthPage = lazy(() => import('@/features/auth/auth-page').then((module) => ({ default: module.AuthPage })))
const ProfilePage = lazy(() => import('@/features/account/profile-page').then((module) => ({ default: module.ProfilePage })))
const WalletsPage = lazy(() => import('@/features/account/wallets-page').then((module) => ({ default: module.WalletsPage })))
const CartPage = lazy(() => import('@/features/cart/cart-page').then((module) => ({ default: module.CartPage })))
const CheckoutPage = lazy(() => import('@/features/checkout/checkout-page').then((module) => ({ default: module.CheckoutPage })))
const ExplorerPage = lazy(() => import('@/features/explorer/explorer-page').then((module) => ({ default: module.ExplorerPage })))
const LabPage = lazy(() => import('@/features/lab/lab-page').then((module) => ({ default: module.LabPage })))
const OrderPage = lazy(() => import('@/features/orders/order-page').then((module) => ({ default: module.OrderPage })))
import { Link } from '@tanstack/react-router'

function requireSession(href: string) {
  if (!getToken()) throw redirect({ to: '/entrar', search: { redirect: href } })
}

function RootLayout() {
  const client = useQueryClientSafe()
  useEffect(() => {
    void mswReady.then(() => connectRealtime(client))
  }, [client])
  return (
    <Shell>
      <Suspense fallback={<div className="px-4 py-10 text-gold-2">Carregando...</div>}>
        <Outlet />
      </Suspense>
      <Toaster theme="dark" />
    </Shell>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => {
        const code = readError(error).code
        if (['not_found', 'unauthorized', 'session_expired', 'validation', 'conflict', 'invalid_credentials'].includes(code)) return false
        return count < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
})

function useQueryClientSafe() {
  return queryClient
}

const rootRoute = createRootRoute({ component: RootLayout })

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    q: typeof search.q === 'string' ? search.q : '',
    category: categories.some((item) => item.id === search.category) ? (search.category as CategoryId) : undefined,
    network: networks.some((item) => item.id === search.network) ? (search.network as NetworkId) : undefined,
    tab: tabs.some((item) => item.id === search.tab) ? (search.tab as TabId) : 'all',
    sort: sorts.some((item) => item.id === search.sort) ? (search.sort as SortId) : 'recent',
    page: Number(search.page) > 0 ? Number(search.page) : 1,
    min: typeof search.min === 'string' ? search.min : undefined,
    max: typeof search.max === 'string' ? search.max : undefined,
  }),
  component: HomePage,
})

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  validateSearch: (search: Record<string, unknown>): DetailSearch => {
    const edition = search.edition
    const qty = Number(search.qty)
    const allowed: EditionId[] = ['1-1', '1-10', '1-50', 'open']
    return {
      edition: allowed.includes(edition as EditionId) ? (edition as EditionId) : '1-50',
      qty: Number.isFinite(qty) && qty > 0 ? Math.min(20, qty) : 1,
    }
  },
  component: DetailPage,
})

const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carrinho', component: CartPage })

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pagamento',
  validateSearch: (search: Record<string, unknown>) => ({ coupon: typeof search.coupon === 'string' ? search.coupon : '' }),
  beforeLoad: ({ location }) => requireSession(location.href),
  component: CheckoutPage,
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedidos/$orderId',
  beforeLoad: ({ location }) => requireSession(location.href),
  component: OrderPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  validateSearch: (search: Record<string, unknown>) => ({ redirect: typeof search.redirect === 'string' ? search.redirect : '/' }),
  component: () => <AuthPage mode="login" />,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  validateSearch: (search: Record<string, unknown>) => ({ redirect: typeof search.redirect === 'string' ? search.redirect : '/' }),
  component: () => <AuthPage mode="register" />,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/conta/perfil',
  beforeLoad: ({ location }) => requireSession(location.href),
  component: ProfilePage,
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/conta/carteiras',
  beforeLoad: ({ location }) => requireSession(location.href),
  component: WalletsPage,
})

const labRoute = createRoute({ getParentRoute: () => rootRoute, path: '/laboratorio', component: LabPage })

const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/explorador/$tx',
  component: ExplorerPage,
})

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-5xl">Página não encontrada</h1>
      <p className="mt-3 text-gold-2">Esse endereço não faz parte do marketplace.</p>
      <Button className="mt-6" asChild><Link to="/" search={emptyHomeSearch}>Ir para o início</Link></Button>
    </div>
  )
}

const routeTree = rootRoute.addChildren([
  homeRoute,
  detailRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
  labRoute,
  explorerRoute,
])

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultNotFoundComponent: NotFound,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
