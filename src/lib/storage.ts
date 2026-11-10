const TOKEN_KEY = 'kurio-token'
const GUEST_KEY = 'kurio-guest-id'
const SCENARIO_KEY = 'kurio-scenario'
const ATTEMPT_KEY = 'kurio-order-attempt'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event('kurio-auth'))
}

export function getGuestId() {
  const current = localStorage.getItem(GUEST_KEY)
  if (current) return current
  const next = crypto.randomUUID()
  localStorage.setItem(GUEST_KEY, next)
  return next
}

export function getScenarioName() {
  return localStorage.getItem(SCENARIO_KEY) ?? 'default'
}

export function setScenarioName(name: string) {
  localStorage.setItem(SCENARIO_KEY, name)
}

export type OrderAttempt = { hash: string; key: string }

export function readOrderAttempt(): OrderAttempt | null {
  const raw = sessionStorage.getItem(ATTEMPT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as OrderAttempt
    if (parsed.hash && parsed.key) return parsed
  } catch {
    return null
  }
  return null
}

export function writeOrderAttempt(attempt: OrderAttempt) {
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt))
}

let currentUserId: string | null = null

export function setCurrentUserId(id: string | null) {
  currentUserId = id
}

export function getCurrentUserId() {
  return currentUserId
}
