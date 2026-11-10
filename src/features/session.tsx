import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { fetchSession } from '@/api/endpoints'
import { cachePolicy } from '@/lib/cache-policy'
import { getToken, setCurrentUserId } from '@/lib/storage'
import { noteVersion } from '@/realtime/client'

function subscribe(listener: () => void) {
  window.addEventListener('kurio-auth', listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener('kurio-auth', listener)
    window.removeEventListener('storage', listener)
  }
}

export function useSession() {
  const token = useSyncExternalStore(subscribe, getToken, () => null)
  const query = useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => fetchSession(signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: cachePolicy.session.staleTime,
  })
  useEffect(() => {
    setCurrentUserId(query.data?.user.id ?? null)
  }, [query.data?.user.id])
  return {
    token,
    user: token ? (query.data?.user ?? null) : null,
    isLoading: Boolean(token) && query.isLoading,
  }
}

export function useOwnerKey() {
  const { user } = useSession()
  return user?.id ?? 'guest'
}

export function usePrivateCleanup() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.removeQueries({
      predicate: (query) => ['favorites', 'quote', 'order', 'profile', 'wallets', 'session'].includes(String(query.queryKey[0])),
    })
    setCurrentUserId(null)
  }
}

export function rememberNftVersion(id: string, version: number) {
  noteVersion(id, version)
}
