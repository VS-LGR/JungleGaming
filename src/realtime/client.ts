import type { QueryClient } from '@tanstack/react-query'
import type { NftSummary, Order, RealtimeEnvelope } from '@/contracts/types'
import { announce } from '@/lib/announce'
import { getCurrentUserId, getToken } from '@/lib/storage'

type SocketClient = {
  on: (event: string, listener: (...args: unknown[]) => void) => void
  emit: (event: string, payload?: unknown) => void
  disconnect: () => void
  connected: boolean
}

let socket: SocketClient | null = null
let starting = false
const versions = new Map<string, number>()
const seen = new Set<string>()
const reconnectHandlers = new Set<() => void>()

export function noteVersion(resourceId: string, version: number) {
  const current = versions.get(resourceId) ?? 0
  if (version > current) versions.set(resourceId, version)
}

function accept(event: { eventId: string; resourceId: string; version: number }) {
  if (seen.has(event.eventId)) return false
  seen.add(event.eventId)
  const current = versions.get(event.resourceId) ?? 0
  if (event.version <= current) return false
  versions.set(event.resourceId, event.version)
  return true
}

export function onRealtimeReconnect(handler: () => void) {
  reconnectHandlers.add(handler)
  return () => {
    reconnectHandlers.delete(handler)
  }
}

export async function connectRealtime(queryClient: QueryClient) {
  if (socket || starting) return
  starting = true
  const { io } = await import('socket.io-client')
  const instance = io(window.location.origin, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 400,
  })
  socket = instance
  let opened = false
  instance.on('connect', () => {
    instance.emit('session.hello', { token: getToken() })
    if (opened) {
      for (const handler of reconnectHandlers) handler()
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
      void queryClient.invalidateQueries({ queryKey: ['nft'] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      void queryClient.invalidateQueries({ queryKey: ['order'] })
    }
    opened = true
  })
  instance.on('nft.updated', (event: RealtimeEnvelope<NftSummary>) => {
    if (!accept(event)) return
    void queryClient.invalidateQueries({ queryKey: ['nfts'] })
    void queryClient.invalidateQueries({ queryKey: ['nft', event.resourceId] })
    void queryClient.invalidateQueries({ queryKey: ['quote'] })
    announce(`Atualização de ${event.payload.name}: preço ou disponibilidade alterados.`)
  })
  instance.on('order.updated', (event: RealtimeEnvelope<Order>) => {
    if (event.userId && event.userId !== getCurrentUserId()) return
    if (!accept(event)) return
    queryClient.setQueryData(['order', event.userId, event.resourceId], event.payload)
    if (event.payload.status === 'confirmed') void queryClient.invalidateQueries({ queryKey: ['quote'] })
    const label = event.payload.status === 'confirmed' ? 'confirmado' : event.payload.status === 'refused' ? 'recusado' : 'pendente'
    announce(`Pedido ${label}.`)
  })
}

export function disconnectRealtime() {
  socket?.disconnect()
  socket = null
  starting = false
  versions.clear()
  seen.clear()
}

export async function refreshRealtime(queryClient: QueryClient) {
  disconnectRealtime()
  await connectRealtime(queryClient)
}
