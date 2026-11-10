import {
  NETWORK_FEES,
  PAGE_SIZE,
  PRICE_MAX,
  PRICE_MIN,
  categories,
  networks,
  type CartLine,
  type CatalogQuery,
  type CatalogResponse,
  type CouponState,
  type Database,
  type EditionId,
  type NetworkId,
  type Nft,
  type NftSummary,
  type Order,
  type OrderStatus,
  type Quote,
  type StoredCartItem,
  type UserRecord,
  type WalletProviderId,
} from '@/contracts/types'
import { addEth, cmpEth, hashString, mulEth, percentEth, subEth } from '@/lib/money'
import { loadDb, saveDb } from '@/mocks/db'
import { readScenario } from '@/mocks/scenarios'

export function toSummary(nft: Nft): NftSummary {
  return {
    id: nft.id,
    tokenId: nft.tokenId,
    name: nft.name,
    image: nft.image,
    thumb: nft.thumb,
    imageAlt: nft.imageAlt,
    category: nft.category,
    network: nft.network,
    listPriceEth: nft.listPriceEth,
    compareAtEth: nft.compareAtEth,
    rare: nft.rare,
    isNew: nft.isNew,
    trending: nft.trending,
    rating: nft.rating,
    ratingCount: nft.ratingCount,
    version: nft.version,
  }
}

function matchesBase(nft: Nft, query: CatalogQuery) {
  const text = query.q.trim().toLowerCase()
  if (text) {
    const haystack = `${nft.name} ${nft.tokenId}`.toLowerCase()
    if (!haystack.includes(text)) return false
  }
  if (query.category && nft.category !== query.category) return false
  if (query.network && nft.network !== query.network) return false
  if (query.minPrice && cmpEth(nft.listPriceEth, query.minPrice) < 0) return false
  if (query.maxPrice && cmpEth(nft.listPriceEth, query.maxPrice) > 0) return false
  if (query.tab === 'new' && !nft.isNew) return false
  if (query.tab === 'trending' && !nft.trending) return false
  return true
}

function sortNfts(items: Nft[], sort: CatalogQuery['sort']) {
  const next = [...items]
  next.sort((a, b) => {
    if (sort === 'price-asc') return cmpEth(a.listPriceEth, b.listPriceEth)
    if (sort === 'price-desc') return cmpEth(b.listPriceEth, a.listPriceEth)
    if (sort === 'name') return a.name.localeCompare(b.name, 'pt')
    return a.createdAt < b.createdAt ? 1 : -1
  })
  return next
}

export function queryCatalog(db: Database, query: CatalogQuery): CatalogResponse {
  if (readScenario() === 'empty') {
    return {
      items: [],
      page: 1,
      pageSize: query.pageSize || PAGE_SIZE,
      total: 0,
      totalPages: 0,
      facets: {
        categories: categories.map((item) => ({ ...item, count: 0 })),
        networks: networks.map((item) => ({ ...item, count: 0 })),
        priceBounds: { min: PRICE_MIN, max: PRICE_MAX },
      },
    }
  }
  const filtered = sortNfts(
    db.nfts.filter((nft) => matchesBase(nft, query)),
    query.sort,
  )
  const pageSize = query.pageSize || PAGE_SIZE
  const total = filtered.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const page = totalPages === 0 ? 1 : Math.min(query.page, totalPages)
  const start = (page - 1) * pageSize
  return {
    items: filtered.slice(start, start + pageSize).map(toSummary),
    page,
    pageSize,
    total,
    totalPages,
    facets: {
      categories: categories.map((item) => ({
        ...item,
        count: db.nfts.filter((nft) => matchesBase(nft, { ...query, category: item.id })).length,
      })),
      networks: networks.map((item) => ({
        ...item,
        count: db.nfts.filter((nft) => matchesBase(nft, { ...query, network: item.id })).length,
      })),
      priceBounds: { min: PRICE_MIN, max: PRICE_MAX },
    },
  }
}

export function cartOwner(user: UserRecord | null, guestId: string | null) {
  if (user) return `user:${user.id}`
  return `guest:${guestId || 'anonymous'}`
}

function editionOf(nft: Nft, editionId: EditionId) {
  return nft.editions.find((edition) => edition.id === editionId) ?? null
}

export function maxQuantity(nft: Nft, editionId: EditionId) {
  const edition = editionOf(nft, editionId)
  if (!edition || !edition.available) return 0
  if (edition.remaining === null) return 20
  return Math.min(20, edition.remaining)
}

export function buildLines(db: Database, items: StoredCartItem[]): CartLine[] {
  return items.flatMap((item) => {
    const nft = db.nfts.find((entry) => entry.id === item.nftId)
    const edition = nft ? editionOf(nft, item.editionId) : null
    if (!nft || !edition) return []
    const available = edition.available && (edition.remaining === null || edition.remaining >= item.quantity) && item.quantity > 0
    return [
      {
        nftId: nft.id,
        editionId: edition.id,
        editionLabel: edition.label,
        quantity: item.quantity,
        name: nft.name,
        tokenId: nft.tokenId,
        image: nft.image,
        thumb: nft.thumb,
        imageAlt: nft.imageAlt,
        unitPriceEth: edition.priceEth,
        lineTotalEth: mulEth(edition.priceEth, item.quantity),
        maxQuantity: maxQuantity(nft, edition.id),
        available,
        priceChanged: edition.priceEth !== item.seenPriceEth,
        version: nft.version,
      },
    ]
  })
}

export function couponState(code: string | undefined): CouponState {
  if (!code) return null
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  const scenario = readScenario()
  if (normalized === 'VENCIDO' || (scenario === 'coupon-expired' && normalized === 'KURIO10')) {
    return { code: normalized, valid: false, reason: 'expired' }
  }
  if (normalized === 'KURIO10' && scenario !== 'coupon-invalid') {
    return { code: normalized, valid: true, label: 'Desconto do lançamento' }
  }
  return { code: normalized, valid: false, reason: 'invalid' }
}

export function buildQuote(db: Database, items: StoredCartItem[], couponCode: string | undefined, network: NetworkId): Quote {
  const lines = buildLines(db, items)
  const coupon = couponState(couponCode)
  const subtotalEth = lines
    .filter((line) => line.available)
    .reduce((sum, line) => addEth(sum, line.lineTotalEth), '0.000')
  const discountEth = coupon?.valid ? percentEth(subtotalEth, '0.10') : '0.000'
  const networkFeeEth = lines.length ? NETWORK_FEES[network] : '0.000'
  const totalEth = addEth(subEth(subtotalEth, discountEth), networkFeeEth)
  const stale = lines.some((line) => line.priceChanged)
  const blocked = lines.length === 0 || lines.some((line) => !line.available) || stale || Boolean(coupon && !coupon.valid)
  const version = hashString(
    lines.map((line) => `${line.nftId}:${line.editionId}:${line.unitPriceEth}:${line.quantity}:${line.available}:${line.version}`).join('|') +
      `|${coupon?.code ?? ''}|${coupon?.valid ?? ''}|${networkFeeEth}`,
  )
  let message: string | null = null
  if (stale) message = 'O preço ou a disponibilidade mudou. Aceite a nova cotação para continuar.'
  else if (lines.some((line) => !line.available)) message = 'Uma edição do carrinho não está mais disponível.'
  else if (coupon && !coupon.valid) message = coupon.reason === 'expired' ? 'Cupom expirado.' : 'Cupom inválido.'
  return {
    quoteId: `q-${version}-${coupon?.code ?? 'none'}-${network}`,
    version,
    items: lines,
    coupon,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    network,
    stale,
    blocked,
    message,
  }
}

export function upsertCartItem(db: Database, key: string, nftId: string, editionId: EditionId, quantity: number, mode: 'add' | 'set') {
  const nft = db.nfts.find((entry) => entry.id === nftId)
  if (!nft) return { ok: false as const, code: 'not_found', message: 'NFT não encontrado.' }
  const edition = editionOf(nft, editionId)
  if (!edition) return { ok: false as const, code: 'not_found', message: 'Edição não encontrada.' }
  const cap = maxQuantity(nft, editionId)
  const current = db.carts[key] ?? []
  const index = current.findIndex((item) => item.nftId === nftId && item.editionId === editionId)
  const previous = index >= 0 ? current[index].quantity : 0
  const nextQuantity = mode === 'add' ? previous + quantity : quantity
  if (nextQuantity < 1) {
    db.carts[key] = current.filter((item) => !(item.nftId === nftId && item.editionId === editionId))
    return { ok: true as const }
  }
  if (cap < 1 || nextQuantity > cap) {
    return { ok: false as const, code: 'unavailable', message: 'A quantidade passa do disponível nesta edição.' }
  }
  const next = [...current]
  const stored: StoredCartItem = {
    nftId,
    editionId,
    quantity: nextQuantity,
    seenPriceEth: index >= 0 ? current[index].seenPriceEth : edition.priceEth,
  }
  if (index >= 0) next[index] = stored
  else next.push(stored)
  db.carts[key] = next
  return { ok: true as const }
}

export function removeCartItem(db: Database, key: string, nftId: string, editionId: EditionId) {
  db.carts[key] = (db.carts[key] ?? []).filter((item) => !(item.nftId === nftId && item.editionId === editionId))
}

export function mergeCarts(db: Database, guestKey: string, userKey: string) {
  const guest = db.carts[guestKey] ?? []
  for (const item of guest) {
    upsertCartItem(db, userKey, item.nftId, item.editionId, item.quantity, 'add')
  }
  delete db.carts[guestKey]
}

export function acknowledgePrices(db: Database, key: string) {
  db.carts[key] = (db.carts[key] ?? []).map((item) => {
    const nft = db.nfts.find((entry) => entry.id === item.nftId)
    const edition = nft?.editions.find((entry) => entry.id === item.editionId)
    return edition ? { ...item, seenPriceEth: edition.priceEth } : item
  })
}

export function publicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
  }
}

function txRef(orderId: string) {
  const compact = orderId.replace(/-/g, '').slice(0, 12).padEnd(12, '0')
  return `0x${compact}E82C`
}

export function createOrder(input: {
  db: Database
  user: UserRecord
  quote: Quote
  provider: WalletProviderId
  walletLabel: string
  observation: string
}): Order {
  const id = crypto.randomUUID()
  const order: Order = {
    id,
    userId: input.user.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
    transactionRef: txRef(id),
    explorerPath: '',
    network: input.quote.network,
    networkLabel: networks.find((item) => item.id === input.quote.network)?.label ?? input.quote.network,
    walletLabel: input.walletLabel,
    provider: input.provider,
    items: input.quote.items.map((item) => ({
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.name,
      tokenId: item.tokenId,
      image: item.image,
      thumb: item.thumb,
      imageAlt: item.imageAlt,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
      lineTotalEth: item.lineTotalEth,
    })),
    subtotalEth: input.quote.subtotalEth,
    discountEth: input.quote.discountEth,
    networkFeeEth: input.quote.networkFeeEth,
    totalEth: input.quote.totalEth,
    observation: input.observation,
    version: 1,
  }
  order.explorerPath = `/explorador/${order.transactionRef}`
  input.db.orders.unshift(order)
  return order
}

export function settleOrder(orderId: string, status: Extract<OrderStatus, 'confirmed' | 'refused'>) {
  const db = loadDb()
  const order = db.orders.find((entry) => entry.id === orderId)
  if (!order || order.status !== 'pending') return null
  order.status = status
  order.version += 1
  if (status === 'confirmed') {
    const key = `user:${order.userId}`
    for (const item of order.items) {
      const nft = db.nfts.find((entry) => entry.id === item.nftId)
      const edition = nft?.editions.find((entry) => entry.id === item.editionId)
      if (edition?.remaining !== null && edition?.remaining !== undefined) {
        edition.remaining = Math.max(0, edition.remaining - item.quantity)
        if (edition.remaining === 0) edition.available = false
      }
      const cart = db.carts[key] ?? []
      db.carts[key] = cart.flatMap((stored) => {
        if (stored.nftId !== item.nftId || stored.editionId !== item.editionId) return [stored]
        const left = stored.quantity - item.quantity
        return left > 0 ? [{ ...stored, quantity: left }] : []
      })
    }
  }
  saveDb(db)
  return order
}

export function bumpEmeraldPrice() {
  const db = loadDb()
  if (db.priceBumpApplied) return null
  const nft = db.nfts.find((entry) => entry.id === 'emerald-ape-0042')
  if (!nft) return null
  const edition = nft.editions.find((entry) => entry.id === '1-50')
  if (!edition) return null
  edition.priceEth = addEth(edition.priceEth, '0.100')
  nft.listPriceEth = edition.priceEth
  nft.version += 1
  db.priceBumpApplied = true
  saveDb(db)
  return nft
}

export function sellOutEmerald() {
  const db = loadDb()
  if (db.soldOutApplied) return null
  const nft = db.nfts.find((entry) => entry.id === 'emerald-ape-0042')
  if (!nft) return null
  const edition = nft.editions.find((entry) => entry.id === '1-50')
  if (!edition) return null
  edition.remaining = 0
  edition.available = false
  nft.version += 1
  db.soldOutApplied = true
  saveDb(db)
  return nft
}

export function bumpForStaleEvents() {
  const db = loadDb()
  if (db.staleEventApplied) return null
  const nft = db.nfts.find((entry) => entry.id === 'emerald-ape-0042')
  if (!nft) return null
  const edition = nft.editions.find((entry) => entry.id === '1-50')
  if (!edition) return null
  edition.priceEth = addEth(edition.priceEth, '0.100')
  nft.listPriceEth = edition.priceEth
  nft.version += 2
  db.staleEventApplied = true
  saveDb(db)
  return { current: nft, oldVersion: nft.version - 1, oldPrice: subEth(edition.priceEth, '0.100') }
}
