import type { Database } from '@/contracts/types'
import { createSeed } from '@/mocks/fixtures'

export const DB_KEY = 'kurio-db-v1'

export function loadDb(): Database {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Database
      if (parsed?.nfts?.length && parsed.users?.length) return parsed
    } catch {
      /* seed again */
    }
  }
  const seeded = createSeed()
  saveDb(seeded)
  return seeded
}

export function saveDb(db: Database) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetDb() {
  localStorage.removeItem(DB_KEY)
  return loadDb()
}
