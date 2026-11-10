import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { Nft, Order, RealtimeEnvelope } from '@/contracts/types'
import { loadDb } from '@/mocks/db'
import { bumpEmeraldPrice, bumpForStaleEvents, sellOutEmerald, settleOrder, toSummary } from '@/mocks/domain'
import { readScenario } from '@/mocks/scenarios'

type LiveSocket = {
  userId: string | null
  emit: (event: string, data: unknown) => void
  close: () => void
}

const sockets = new Set<LiveSocket>()
let scenarioTimer: number | null = null

// MSW removes the `/socket.io/` prefix before matching, so the link is the namespace.
export const realtime = ws.link('*')

function userIdFromToken(token: string | null) {
  if (!token) return null
  const db = loadDb()
  return db.sessions.find((session) => session.token === token)?.userId ?? null
}

export function nftEvent(nft: Nft, eventId = crypto.randomUUID()): RealtimeEnvelope<ReturnType<typeof toSummary>> {
  return {
    eventId,
    resourceId: nft.id,
    version: nft.version,
    payload: toSummary(nft),
  }
}

export function orderEvent(order: Order): RealtimeEnvelope<Order> {
  return {
    eventId: crypto.randomUUID(),
    resourceId: order.id,
    version: order.version,
    userId: order.userId,
    payload: order,
  }
}

export function publishNft(nft: Nft, event?: RealtimeEnvelope<ReturnType<typeof toSummary>>) {
  const message = event ?? nftEvent(nft)
  for (const socket of sockets) socket.emit('nft.updated', message)
}

export function publishOrder(order: Order) {
  const message = orderEvent(order)
  for (const socket of sockets) {
    if (socket.userId !== order.userId) continue
    socket.emit('order.updated', message)
  }
}

export function closeSockets() {
  for (const socket of sockets) socket.close()
  sockets.clear()
}

function scheduleCatalogScenario() {
  if (scenarioTimer !== null) return
  const scenario = readScenario()
  if (!['price-changed', 'edition-sold-out', 'duplicate-event', 'stale-event'].includes(scenario)) return
  scenarioTimer = window.setTimeout(() => {
    scenarioTimer = null
    if (scenario === 'price-changed' || scenario === 'duplicate-event') {
      const nft = bumpEmeraldPrice()
      if (!nft) return
      const event = nftEvent(nft)
      publishNft(nft, event)
      if (scenario === 'duplicate-event') publishNft(nft, event)
      return
    }
    if (scenario === 'edition-sold-out') {
      const nft = sellOutEmerald()
      if (nft) publishNft(nft)
      return
    }
    const stale = bumpForStaleEvents()
    if (!stale) return
    publishNft(stale.current)
    publishNft(stale.current, {
      eventId: crypto.randomUUID(),
      resourceId: stale.current.id,
      version: stale.oldVersion,
      payload: { ...toSummary(stale.current), listPriceEth: stale.oldPrice, version: stale.oldVersion },
    })
  }, 700)
}

export function scheduleOrderResolution(orderId: string) {
  const scenario = readScenario()
  if (scenario === 'payment-refused') {
    window.setTimeout(() => {
      const order = settleOrder(orderId, 'refused')
      if (order) publishOrder(order)
    }, 600)
    return
  }
  if (scenario === 'drop-socket') {
    window.setTimeout(() => closeSockets(), 300)
    window.setTimeout(() => {
      const order = settleOrder(orderId, 'confirmed')
      if (order) publishOrder(order)
    }, 800)
    return
  }
  window.setTimeout(() => {
    const order = settleOrder(orderId, 'confirmed')
    if (order) publishOrder(order)
  }, 600)
}

function replayFor(socket: LiveSocket) {
  if (!socket.userId) return
  const db = loadDb()
  for (const order of db.orders) {
    if (order.userId !== socket.userId || order.status === 'pending') continue
    socket.emit('order.updated', orderEvent(order))
  }
}

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  const io = toSocketIo(connection)
  const entry: LiveSocket = {
    userId: null,
    emit: (event, data) => io.client.emit(event, data),
    close: () => connection.client.close(),
  }
  sockets.add(entry)
  io.client.on('session.hello', (_event: MessageEvent, payload?: { token?: string | null }) => {
    entry.userId = userIdFromToken(payload?.token ?? null)
    replayFor(entry)
  })
  scheduleCatalogScenario()
  connection.client.addEventListener('close', () => {
    sockets.delete(entry)
  })
})
