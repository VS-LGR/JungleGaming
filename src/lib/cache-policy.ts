export const cachePolicy = {
  catalog: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 2 },
  detail: { staleTime: 15_000, gcTime: 5 * 60_000, retry: 2 },
  session: { staleTime: 60_000, gcTime: 5 * 60_000, retry: 1 },
  private: { staleTime: 0, gcTime: 5 * 60_000, retry: 1 },
  mutations: { retry: 0 },
  requestTimeoutMs: 4_000,
} as const

export const privateQueryRoots = ['favorites', 'cart', 'quote', 'order', 'orders', 'profile', 'wallets', 'session'] as const

export function isPrivateQuery(key: readonly unknown[]) {
  return privateQueryRoots.includes(key[0] as (typeof privateQueryRoots)[number])
}
