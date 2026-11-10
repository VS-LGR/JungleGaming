import { delay, http, HttpResponse } from 'msw'
import {
  type CatalogQuery,
  type EditionId,
  type NetworkId,
  type Wallet,
  type WalletProviderId,
  categories,
  networks,
  sorts,
  tabs,
  walletProviders,
} from '@/contracts/types'
import { hashString, isDecimal } from '@/lib/money'
import { loadDb, resetDb, saveDb } from '@/mocks/db'
import {
  acknowledgePrices,
  buildQuote,
  cartOwner,
  createOrder,
  mergeCarts,
  publicUser,
  queryCatalog,
  removeCartItem,
  upsertCartItem,
} from '@/mocks/domain'
import { isScenario, readScenario, writeScenario } from '@/mocks/scenarios'
import { scheduleOrderResolution } from '@/mocks/socket'

function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, fields } }, { status })
}

async function gate(request: Request) {
  const scenario = readScenario()
  const url = new URL(request.url)
  if (scenario === 'offline') return HttpResponse.error()
  if (scenario === 'server-error' && url.pathname.startsWith('/api/nfts')) {
    await delay(180)
    return apiError(503, 'unavailable', 'O mercado está indisponível no momento.')
  }
  let ms = 90
  if (scenario === 'slow') ms = 1600
  if (scenario === 'variable-latency') ms = 80 + (hashString(url.pathname + url.search) % 640)
  if (scenario === 'out-of-order') {
    const page = Number(url.searchParams.get('page') || '1')
    ms = Math.max(60, 980 - page * 280)
  }
  await delay(ms)
  return null
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function sessionUser(request: Request) {
  if (readScenario() === 'session-expired') {
    return { error: apiError(401, 'session_expired', 'Sua sessão expirou.') }
  }
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: apiError(401, 'unauthorized', 'Entre para continuar.') }
  const db = loadDb()
  const session = db.sessions.find((item) => item.token === token)
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return { error: apiError(401, 'session_expired', 'Sua sessão expirou.') }
  }
  const user = db.users.find((item) => item.id === session.userId)
  if (!user) return { error: apiError(401, 'unauthorized', 'Sessão inválida.') }
  return { db, user, token }
}

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return values.find((item) => item === value)
}

function catalogQuery(url: URL): CatalogQuery {
  const minPrice = url.searchParams.get('minPrice') ?? undefined
  const maxPrice = url.searchParams.get('maxPrice') ?? undefined
  const page = Number(url.searchParams.get('page') || '1')
  return {
    q: url.searchParams.get('q') ?? '',
    category: oneOf(categories.map((item) => item.id), url.searchParams.get('category')),
    network: oneOf(networks.map((item) => item.id), url.searchParams.get('network')),
    tab: oneOf(tabs.map((item) => item.id), url.searchParams.get('tab')) ?? 'all',
    sort: oneOf(sorts.map((item) => item.id), url.searchParams.get('sort')) ?? 'recent',
    minPrice: minPrice && isDecimal(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice && isDecimal(maxPrice) ? maxPrice : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 9,
  }
}

function guestId(request: Request) {
  return request.headers.get('X-Guest-Id')
}

async function readJson<T>(request: Request) {
  return (await request.json()) as T
}

export const handlers = [
  http.post('/api/mock/reset', async () => {
    resetDb()
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/mock/scenario', async ({ request }) => {
    const body = await readJson<{ name?: string }>(request)
    const name = body.name ?? null
    if (!isScenario(name)) return apiError(400, 'validation', 'Cenário desconhecido.')
    writeScenario(name)
    return HttpResponse.json({ scenario: body.name })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const body = await readJson<{ email?: string; username?: string; password?: string; displayName?: string }>(request)
    const email = body.email?.trim().toLowerCase() ?? ''
    const username = body.username?.trim().toLowerCase() ?? ''
    const fields: Record<string, string> = {}
    if (!email.includes('@')) fields.email = 'E-mail inválido.'
    if (username.length < 3) fields.username = 'O usuário precisa ter ao menos 3 caracteres.'
    if (!body.password || body.password.length < 8) fields.password = 'A senha precisa ter ao menos 8 caracteres.'
    if (Object.keys(fields).length) return apiError(400, 'validation', 'Revise os campos.', fields)
    if (readScenario() === 'register-conflict') {
      return apiError(409, 'conflict', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
    }
    const db = loadDb()
    if (db.users.some((user) => user.email === email)) {
      return apiError(409, 'conflict', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
    }
    if (db.users.some((user) => user.username === username)) {
      return apiError(409, 'conflict', 'Este usuário já está em uso.', { username: 'Este usuário já está em uso.' })
    }
    const user = {
      id: crypto.randomUUID(),
      email,
      username,
      displayName: body.displayName?.trim() || username,
      ensName: username,
      walletNickname: 'Principal',
      avatarUrl: null,
      passwordHash: await sha256(body.password ?? ''),
      favoriteIds: [],
    }
    db.users.push(user)
    db.wallets[user.id] = { primary: null, secondary: null }
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()
    db.sessions.push({ token, userId: user.id, expiresAt })
    mergeCarts(db, cartOwner(null, guestId(request)), cartOwner(user, null))
    saveDb(db)
    return HttpResponse.json({ token, expiresAt, user: publicUser(user) }, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const body = await readJson<{ email?: string; password?: string }>(request)
    const db = loadDb()
    const email = body.email?.trim().toLowerCase() ?? ''
    const user = db.users.find((item) => item.email === email)
    const hash = await sha256(body.password ?? '')
    if (!user || user.passwordHash !== hash) {
      return apiError(401, 'invalid_credentials', 'E-mail ou senha incorretos.')
    }
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()
    db.sessions.push({ token, userId: user.id, expiresAt })
    mergeCarts(db, cartOwner(null, guestId(request)), cartOwner(user, null))
    saveDb(db)
    return HttpResponse.json({ token, expiresAt, user: publicUser(user) })
  }),

  http.get('/api/auth/session', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    return HttpResponse.json({ token: auth.token, expiresAt: auth.db.sessions.find((item) => item.token === auth.token)?.expiresAt, user: publicUser(auth.user) })
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const auth = sessionUser(request)
    if (auth.error) return HttpResponse.json({ ok: true })
    auth.db.sessions = auth.db.sessions.filter((item) => item.token !== auth.token)
    saveDb(auth.db)
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/nfts', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const db = loadDb()
    return HttpResponse.json(queryCatalog(db, catalogQuery(new URL(request.url))))
  }),

  http.get('/api/nfts/:id', async ({ request, params }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const db = loadDb()
    const nft = db.nfts.find((item) => item.id === params.id)
    if (!nft) return apiError(404, 'not_found', 'NFT não encontrado.')
    return HttpResponse.json(nft)
  }),

  http.get('/api/favorites', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    return HttpResponse.json({ ids: auth.user.favoriteIds })
  }),

  http.put('/api/favorites/:id', async ({ request, params }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    if (readScenario() === 'favorite-fail') return apiError(500, 'favorite_failed', 'Não foi possível salvar o favorito.')
    const id = String(params.id)
    if (!auth.db.nfts.some((nft) => nft.id === id)) return apiError(404, 'not_found', 'NFT não encontrado.')
    if (!auth.user.favoriteIds.includes(id)) auth.user.favoriteIds.push(id)
    saveDb(auth.db)
    return HttpResponse.json({ ids: auth.user.favoriteIds })
  }),

  http.delete('/api/favorites/:id', async ({ request, params }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    if (readScenario() === 'favorite-fail') return apiError(500, 'favorite_failed', 'Não foi possível remover o favorito.')
    const id = String(params.id)
    auth.user.favoriteIds = auth.user.favoriteIds.filter((item) => item !== id)
    saveDb(auth.db)
    return HttpResponse.json({ ids: auth.user.favoriteIds })
  }),

  http.get('/api/cart', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    const db = auth.error ? loadDb() : auth.db
    const user = auth.error ? null : auth.user
    const key = cartOwner(user, guestId(request))
    return HttpResponse.json({ items: db.carts[key] ?? [] })
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const body = await readJson<{ nftId?: string; editionId?: EditionId; quantity?: number }>(request)
    const auth = sessionUser(request)
    const db = auth.error ? loadDb() : auth.db
    const key = cartOwner(auth.error ? null : auth.user, guestId(request))
    const result = upsertCartItem(db, key, body.nftId ?? '', body.editionId ?? '1-50', body.quantity ?? 1, 'add')
    if (!result.ok) return apiError(result.code === 'not_found' ? 404 : 409, result.code, result.message)
    saveDb(db)
    return HttpResponse.json({ items: db.carts[key] ?? [] })
  }),

  http.patch('/api/cart/items', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const body = await readJson<{ nftId?: string; editionId?: EditionId; quantity?: number }>(request)
    const auth = sessionUser(request)
    const db = auth.error ? loadDb() : auth.db
    const key = cartOwner(auth.error ? null : auth.user, guestId(request))
    const result = upsertCartItem(db, key, body.nftId ?? '', body.editionId ?? '1-50', body.quantity ?? 1, 'set')
    if (!result.ok) return apiError(result.code === 'not_found' ? 404 : 409, result.code, result.message)
    saveDb(db)
    return HttpResponse.json({ items: db.carts[key] ?? [] })
  }),

  http.delete('/api/cart/items', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const url = new URL(request.url)
    const auth = sessionUser(request)
    const db = auth.error ? loadDb() : auth.db
    const key = cartOwner(auth.error ? null : auth.user, guestId(request))
    removeCartItem(db, key, url.searchParams.get('nftId') ?? '', (url.searchParams.get('editionId') as EditionId) ?? '1-50')
    saveDb(db)
    return HttpResponse.json({ items: db.carts[key] ?? [] })
  }),

  http.get('/api/quotes', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const url = new URL(request.url)
    const auth = sessionUser(request)
    const db = auth.error ? loadDb() : auth.db
    const key = cartOwner(auth.error ? null : auth.user, guestId(request))
    const network = oneOf(networks.map((item) => item.id), url.searchParams.get('network')) ?? 'ethereum'
    return HttpResponse.json(buildQuote(db, db.carts[key] ?? [], url.searchParams.get('coupon') ?? undefined, network))
  }),

  http.post('/api/quotes/ack', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const url = new URL(request.url)
    const auth = sessionUser(request)
    const db = auth.error ? loadDb() : auth.db
    const key = cartOwner(auth.error ? null : auth.user, guestId(request))
    acknowledgePrices(db, key)
    saveDb(db)
    const network = oneOf(networks.map((item) => item.id), url.searchParams.get('network')) ?? 'ethereum'
    return HttpResponse.json(buildQuote(db, db.carts[key] ?? [], url.searchParams.get('coupon') ?? undefined, network))
  }),

  http.post('/api/orders', async ({ request }) => {
    const scenario = readScenario()
    if (scenario === 'offline') return HttpResponse.error()
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    const key = request.headers.get('Idempotency-Key')
    if (!key) return apiError(400, 'validation', 'Informe a chave de idempotência.')
    const body = await readJson<{
      quoteId?: string
      provider?: WalletProviderId
      walletId?: string
      network?: NetworkId
      observation?: string
      coupon?: string
      connection?: string
    }>(request)
    const bodyHash = JSON.stringify({
      quoteId: body.quoteId,
      provider: body.provider,
      walletId: body.walletId,
      network: body.network,
      observation: body.observation ?? '',
      coupon: body.coupon ?? '',
    })
    const existing = auth.db.idempotency.find((item) => item.key === key && item.userId === auth.user.id)
    if (existing) {
      if (existing.hash !== bodyHash) return apiError(409, 'idempotency_conflict', 'A chave já foi usada com outro pedido.')
      const order = auth.db.orders.find((item) => item.id === existing.orderId)
      return HttpResponse.json(order)
    }
    if (body.connection !== 'connected') return apiError(400, 'wallet_disconnected', 'Conecte uma carteira antes de confirmar.')
    if (!oneOf(walletProviders.map((item) => item.id), body.provider ?? null)) {
      return apiError(400, 'validation', 'Selecione uma carteira.', { provider: 'Selecione uma carteira.' })
    }
    const network = oneOf(networks.map((item) => item.id), body.network ?? null) ?? 'ethereum'
    const stored = auth.db.wallets[auth.user.id]
    const wallet = [stored?.primary, stored?.secondary].find((item) => item?.id === body.walletId)
    if (!wallet) return apiError(403, 'forbidden', 'A carteira não pertence a esta conta.')
    const quote = buildQuote(auth.db, auth.db.carts[cartOwner(auth.user, null)] ?? [], body.coupon, network)
    if (quote.quoteId !== body.quoteId || quote.blocked) {
      return HttpResponse.json(
        { error: { code: 'quote_stale', message: quote.message ?? 'A cotação mudou. Confirme novamente.', quote } },
        { status: 409 },
      )
    }
    const order = createOrder({
      db: auth.db,
      user: auth.user,
      quote,
      provider: body.provider as WalletProviderId,
      walletLabel: wallet.nickname,
      observation: body.observation?.trim() ?? '',
    })
    auth.db.idempotency.push({ key, userId: auth.user.id, hash: bodyHash, orderId: order.id })
    saveDb(auth.db)
    if (scenario === 'order-timeout') {
      scheduleOrderResolution(order.id)
      await delay(8_000)
      return HttpResponse.json(order, { status: 201 })
    }
    scheduleOrderResolution(order.id)
    await delay(120)
    return HttpResponse.json(order, { status: 201 })
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    const order = auth.db.orders.find((item) => item.id === params.id)
    if (!order) return apiError(404, 'not_found', 'Pedido não encontrado.')
    if (order.userId !== auth.user.id) return apiError(403, 'forbidden', 'Este pedido pertence a outra conta.')
    return HttpResponse.json(order)
  }),

  http.get('/api/profile', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.patch('/api/profile', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    const body = await readJson<Partial<{ displayName: string; username: string; email: string; ensName: string; walletNickname: string }>>(request)
    const fields: Record<string, string> = {}
    const displayName = body.displayName?.trim() ?? ''
    const username = body.username?.trim().toLowerCase() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const ensName = body.ensName?.trim().toLowerCase().replace(/\.eth$/, '') ?? ''
    if (displayName.length < 2) fields.displayName = 'Informe o nome de exibição.'
    if (!/^[a-z0-9._]{3,20}$/.test(username)) fields.username = 'Use 3 a 20 letras, números, ponto ou _.'
    if (!email.includes('@')) fields.email = 'E-mail inválido.'
    if (!/^[a-z0-9.]{3,32}$/.test(ensName)) fields.ensName = 'Nome ENS inválido.'
    if (auth.db.users.some((user) => user.id !== auth.user.id && user.email === email)) fields.email = 'Este e-mail já está em uso.'
    if (auth.db.users.some((user) => user.id !== auth.user.id && user.username === username)) fields.username = 'Este usuário já está em uso.'
    if (Object.keys(fields).length) return apiError(400, 'validation', 'Revise os campos.', fields)
    Object.assign(auth.user, {
      displayName,
      username,
      email,
      ensName,
      walletNickname: body.walletNickname?.trim() || auth.user.walletNickname,
    })
    saveDb(auth.db)
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.post('/api/profile/avatar', async ({ request }) => {
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    const body = await readJson<{ dataUrl?: string }>(request)
    if (!body.dataUrl?.startsWith('data:image/')) return apiError(400, 'validation', 'Envie uma imagem.', { avatar: 'Envie uma imagem.' })
    if (body.dataUrl.length > 280_000) return apiError(400, 'validation', 'A imagem é grande demais.', { avatar: 'Use uma imagem menor.' })
    auth.user.avatarUrl = body.dataUrl
    saveDb(auth.db)
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.delete('/api/profile/avatar', async ({ request }) => {
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    auth.user.avatarUrl = null
    saveDb(auth.db)
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    const body = await readJson<{ current?: string; next?: string }>(request)
    const fields: Record<string, string> = {}
    const currentHash = await sha256(body.current ?? '')
    if (currentHash !== auth.user.passwordHash) fields.current = 'A senha atual não confere.'
    if (!body.next || body.next.length < 8 || !/[a-z]/i.test(body.next) || !/\d/.test(body.next)) {
      fields.next = 'Use 8 caracteres, com letra e número.'
    }
    if (body.next && body.next === body.current) fields.next = 'A nova senha precisa ser diferente.'
    if (Object.keys(fields).length) return apiError(400, 'validation', 'Revise a senha.', fields)
    auth.user.passwordHash = await sha256(body.next ?? '')
    saveDb(auth.db)
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/wallets', async ({ request }) => {
    const blocked = await gate(request)
    if (blocked) return blocked
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    return HttpResponse.json(auth.db.wallets[auth.user.id] ?? { primary: null, secondary: null })
  }),

  http.put('/api/wallets/:role', async ({ request, params }) => {
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    const role = params.role === 'secondary' ? 'secondary' : params.role === 'primary' ? 'primary' : null
    if (!role) return apiError(404, 'not_found', 'Carteira não encontrada.')
    const body = await readJson<Partial<Wallet>>(request)
    const fields = validateWallet(body)
    if (Object.keys(fields).length) return apiError(400, 'validation', 'Revise a carteira.', fields)
    const current = auth.db.wallets[auth.user.id] ?? { primary: null, secondary: null }
    const next: Wallet = {
      id: current[role]?.id ?? crypto.randomUUID(),
      role,
      displayName: body.displayName!.trim(),
      nickname: body.nickname!.trim(),
      network: body.network!,
      profileName: body.profileName!.trim(),
      address: body.address!.trim(),
      walletType: body.walletType!,
      email: body.email!.trim().toLowerCase(),
      ensName: body.ensName!.trim().toLowerCase().replace(/\.eth$/, ''),
      referralCode: body.referralCode!.trim(),
      sameAsPrimary: Boolean(body.sameAsPrimary),
    }
    current[role] = next
    auth.db.wallets[auth.user.id] = current
    saveDb(auth.db)
    return HttpResponse.json(current)
  }),

  http.delete('/api/wallets/secondary', async ({ request }) => {
    const auth = sessionUser(request)
    if (auth.error) return auth.error
    const current = auth.db.wallets[auth.user.id] ?? { primary: null, secondary: null }
    current.secondary = null
    auth.db.wallets[auth.user.id] = current
    saveDb(auth.db)
    return HttpResponse.json(current)
  }),
]

function validateWallet(body: Partial<Wallet>) {
  const fields: Record<string, string> = {}
  if (!body.displayName || body.displayName.trim().length < 2) fields.displayName = 'Informe o nome de exibição.'
  if (!body.nickname || body.nickname.trim().length < 2) fields.nickname = 'Informe o apelido.'
  if (!oneOf(networks.map((item) => item.id), body.network ?? null)) fields.network = 'Selecione uma rede.'
  if (!body.profileName || body.profileName.trim().length < 2) fields.profileName = 'Informe o nome do perfil.'
  if (!body.address || body.address.trim().length < 20) fields.address = 'Endereço inválido.'
  if (body.network !== 'solana' && body.address && !/^0x[a-fA-F0-9]{40}$/.test(body.address.trim())) {
    fields.address = 'Use um endereço 0x de 40 caracteres.'
  }
  if (!oneOf(walletProviders.map((item) => item.id), body.walletType ?? null)) fields.walletType = 'Selecione o tipo de carteira.'
  if (!body.email?.includes('@')) fields.email = 'E-mail inválido.'
  if (!body.ensName || body.ensName.trim().length < 3) fields.ensName = 'Informe o nome ENS.'
  if (!body.referralCode || body.referralCode.trim().length < 3) fields.referralCode = 'Informe o código de indicação.'
  return fields
}
