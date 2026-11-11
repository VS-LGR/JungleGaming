export const categories = [
  { id: 'arte-digital', label: 'Arte digital' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'musica', label: 'Música' },
  { id: 'arte-3d', label: 'Arte 3D' },
  { id: 'colecionaveis', label: 'Colecionáveis' },
  { id: 'generativa', label: 'Generativa' },
  { id: 'jogos', label: 'Jogos' },
  { id: 'assinaturas', label: 'Assinaturas' },
  { id: 'utilidade', label: 'Utilidade' },
] as const

export const networks = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
] as const

export const sorts = [
  { id: 'recent', label: 'Listados recentemente' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
  { id: 'name', label: 'Nome' },
] as const

export const tabs = [
  { id: 'all', label: 'Todos os NFTs' },
  { id: 'new', label: 'Novos lançamentos' },
  { id: 'trending', label: 'Em alta' },
] as const

export const walletProviders = [
  { id: 'metamask', label: 'MetaMask' },
  { id: 'walletconnect', label: 'WalletConnect' },
  { id: 'coinbase', label: 'Coinbase Wallet' },
] as const

export type CategoryId = (typeof categories)[number]['id']
export type NetworkId = (typeof networks)[number]['id']
export type SortId = (typeof sorts)[number]['id']
export type TabId = (typeof tabs)[number]['id']
export type EditionId = '1-1' | '1-10' | '1-50' | 'open'
export type WalletProviderId = (typeof walletProviders)[number]['id']
export type OrderStatus = 'pending' | 'confirmed' | 'refused'

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export type Edition = {
  id: EditionId
  label: string
  supply: number | null
  remaining: number | null
  priceEth: string
  available: boolean
}

export type Review = {
  id: string
  author: string
  rating: number
  text: string
}

export type Nft = {
  id: string
  tokenId: string
  name: string
  image: string
  thumb: string
  imageAlt: string
  category: CategoryId
  network: NetworkId
  listPriceEth: string
  compareAtEth: string | null
  rare: boolean
  isNew: boolean
  trending: boolean
  featured: boolean
  rating: number
  ratingCount: number
  createdAt: string
  description: string
  longDescription: string
  collection: string
  attributes: string[]
  editions: Edition[]
  contract: string
  royalty: string
  reviews: Review[]
  version: number
}

export type NftSummary = Pick<
  Nft,
  | 'id'
  | 'tokenId'
  | 'name'
  | 'image'
  | 'thumb'
  | 'imageAlt'
  | 'category'
  | 'network'
  | 'listPriceEth'
  | 'compareAtEth'
  | 'rare'
  | 'isNew'
  | 'trending'
  | 'rating'
  | 'ratingCount'
  | 'version'
>

export type CatalogQuery = {
  q: string
  category?: CategoryId
  minPrice?: string
  maxPrice?: string
  network?: NetworkId
  tab: TabId
  sort: SortId
  page: number
  pageSize: number
}

export type FacetCount<T extends string> = { id: T; label: string; count: number }

export type CatalogResponse = {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: {
    categories: FacetCount<CategoryId>[]
    networks: FacetCount<NetworkId>[]
    priceBounds: { min: string; max: string }
  }
}

export type UserPublic = {
  id: string
  email: string
  displayName: string
  username: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
}

export type SessionResponse = {
  token: string
  expiresAt: string
  user: UserPublic
}

export type Wallet = {
  id: string
  role: 'primary' | 'secondary'
  displayName: string
  nickname: string
  network: NetworkId
  profileName: string
  address: string
  walletType: WalletProviderId
  email: string
  ensName: string
  referralCode: string
  sameAsPrimary: boolean
}

export type CartLine = {
  nftId: string
  editionId: EditionId
  editionLabel: string
  quantity: number
  name: string
  tokenId: string
  image: string
  thumb: string
  imageAlt: string
  unitPriceEth: string
  lineTotalEth: string
  maxQuantity: number
  available: boolean
  priceChanged: boolean
  version: number
}

export type CouponState =
  | { code: string; valid: true; label: string }
  | { code: string; valid: false; reason: 'invalid' | 'expired' }
  | null

export type Quote = {
  quoteId: string
  version: number
  items: CartLine[]
  coupon: CouponState
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  network: NetworkId
  stale: boolean
  blocked: boolean
  message: string | null
}

export type OrderItem = {
  nftId: string
  editionId: EditionId
  name: string
  tokenId: string
  image: string
  thumb: string
  imageAlt: string
  quantity: number
  unitPriceEth: string
  lineTotalEth: string
}

export type Order = {
  id: string
  userId: string
  status: OrderStatus
  createdAt: string
  transactionRef: string
  explorerPath: string
  network: NetworkId
  networkLabel: string
  walletLabel: string
  provider: WalletProviderId
  items: OrderItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  observation: string
  version: number
}

export type RealtimeEnvelope<T> = {
  eventId: string
  resourceId: string
  version: number
  userId?: string
  payload: T
}

export type StoredCartItem = {
  nftId: string
  editionId: EditionId
  quantity: number
  seenPriceEth: string
}

export type UserRecord = UserPublic & {
  passwordHash: string
  favoriteIds: string[]
}

export type SessionRecord = {
  token: string
  userId: string
  expiresAt: string
}

export type IdempotencyRecord = {
  key: string
  userId: string
  hash: string
  orderId: string
}

export type Database = {
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: Nft[]
  carts: Record<string, StoredCartItem[]>
  wallets: Record<string, { primary: Wallet | null; secondary: Wallet | null }>
  orders: Order[]
  idempotency: IdempotencyRecord[]
  priceBumpApplied: boolean
  soldOutApplied: boolean
  staleEventApplied: boolean
  catalogFailures: number
  sessionRenewed: boolean
}

export const PASSWORD_HASH = '0d51448abf3dd93936605848964687ba0cb115f51c743419f2ddba7fa0d2166b'
export const PAGE_SIZE = 9
export const PRICE_MIN = '0.020'
export const PRICE_MAX = '12.300'
export const NETWORK_FEES: Record<NetworkId, string> = {
  ethereum: '0.016',
  polygon: '0.008',
  solana: '0.004',
}
