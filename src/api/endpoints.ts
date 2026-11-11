import type {
  CatalogQuery,
  CatalogResponse,
  EditionId,
  NetworkId,
  Nft,
  Order,
  Quote,
  SessionResponse,
  StoredCartItem,
  UserPublic,
  Wallet,
  WalletProviderId,
} from '@/contracts/types'
import { api, isTimeout } from '@/api/client'
import { readOrderAttempt, setSessionExpiry, writeOrderAttempt } from '@/lib/storage'

export async function fetchCatalog(query: CatalogQuery, signal?: AbortSignal) {
  const { data } = await api.get<CatalogResponse>('/nfts', {
    signal,
    params: {
      q: query.q || undefined,
      category: query.category,
      network: query.network,
      tab: query.tab,
      sort: query.sort,
      page: query.page,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    },
  })
  return data
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Nft>(`/nfts/${id}`, { signal })
  return data
}

export async function fetchSession(signal?: AbortSignal) {
  const { data } = await api.get<SessionResponse>('/auth/session', { signal })
  if (data.expiresAt) setSessionExpiry(data.expiresAt)
  return data
}

export async function login(email: string, password: string) {
  const { data } = await api.post<SessionResponse>('/auth/login', { email, password })
  return data
}

export async function register(input: { email: string; username: string; password: string; displayName: string }) {
  const { data } = await api.post<SessionResponse>('/auth/register', input)
  return data
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function fetchFavorites(signal?: AbortSignal) {
  const { data } = await api.get<{ ids: string[] }>('/favorites', { signal })
  return data.ids
}

export async function addFavorite(id: string) {
  const { data } = await api.put<{ ids: string[] }>(`/favorites/${id}`)
  return data.ids
}

export async function removeFavorite(id: string) {
  const { data } = await api.delete<{ ids: string[] }>(`/favorites/${id}`)
  return data.ids
}

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await api.get<{ items: StoredCartItem[] }>('/cart', { signal })
  return data.items
}

export async function addCartItem(nftId: string, editionId: EditionId, quantity: number) {
  const { data } = await api.post<{ items: StoredCartItem[] }>('/cart/items', { nftId, editionId, quantity })
  return data.items
}

export async function updateCartItem(nftId: string, editionId: EditionId, quantity: number) {
  const { data } = await api.patch<{ items: StoredCartItem[] }>('/cart/items', { nftId, editionId, quantity })
  return data.items
}

export async function deleteCartItem(nftId: string, editionId: EditionId) {
  const { data } = await api.delete<{ items: StoredCartItem[] }>('/cart/items', { params: { nftId, editionId } })
  return data.items
}

export async function fetchQuote(coupon: string, network: NetworkId, signal?: AbortSignal) {
  const { data } = await api.get<Quote>('/quotes', { signal, params: { coupon: coupon || undefined, network } })
  return data
}

export async function acknowledgeQuote(coupon: string, network: NetworkId) {
  const { data } = await api.post<Quote>('/quotes/ack', null, { params: { coupon: coupon || undefined, network } })
  return data
}

export type OrderInput = {
  quoteId: string
  provider: WalletProviderId
  walletId: string
  network: NetworkId
  observation: string
  coupon: string
  connection: 'connected'
}

export async function createOrder(input: OrderInput) {
  const hash = JSON.stringify(input)
  const existing = readOrderAttempt()
  const key = existing?.hash === hash ? existing.key : crypto.randomUUID()
  writeOrderAttempt({ hash, key })
  const send = () =>
    api.post<Order>('/orders', input, {
      headers: { 'Idempotency-Key': key },
      timeout: 3_000,
    })
  try {
    const { data } = await send()
    return data
  } catch (error) {
    if (!isTimeout(error)) throw error
    const { data } = await send()
    return data
  }
}

export async function fetchOrder(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Order>(`/orders/${id}`, { signal })
  return data
}

export async function updateProfile(input: Partial<UserPublic>) {
  const { data } = await api.patch<UserPublic>('/profile', input)
  return data
}

export async function updateAvatar(dataUrl: string) {
  const { data } = await api.post<UserPublic>('/profile/avatar', { dataUrl })
  return data
}

export async function removeAvatar() {
  const { data } = await api.delete<UserPublic>('/profile/avatar')
  return data
}

export async function changePassword(current: string, next: string) {
  await api.post('/profile/password', { current, next })
}

export async function fetchWallets(signal?: AbortSignal) {
  const { data } = await api.get<{ primary: Wallet | null; secondary: Wallet | null }>('/wallets', { signal })
  return data
}

export async function saveWallet(role: 'primary' | 'secondary', wallet: Omit<Wallet, 'id' | 'role'>) {
  const { data } = await api.put<{ primary: Wallet | null; secondary: Wallet | null }>(`/wallets/${role}`, wallet)
  return data
}

export async function resetMock() {
  await api.post('/mock/reset')
}

export async function selectScenario(name: string) {
  await api.post('/mock/scenario', { name })
}
