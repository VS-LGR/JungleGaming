const TOKEN_KEY = 'kurio-token'
const EXPIRY_KEY = 'kurio-session-exp'
const GUEST_KEY = 'kurio-guest-id'
const SCENARIO_KEY = 'kurio-scenario'
const ATTEMPT_KEY = 'kurio-order-attempt'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null, expiresAt?: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    if (expiresAt) localStorage.setItem(EXPIRY_KEY, expiresAt)
  } else {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
  }
  window.dispatchEvent(new Event('kurio-auth'))
}

export function getSessionExpiry() {
  return localStorage.getItem(EXPIRY_KEY)
}

export function setSessionExpiry(expiresAt: string) {
  localStorage.setItem(EXPIRY_KEY, expiresAt)
}

export function sessionExpiredLocally(now = Date.now()) {
  const expiry = getSessionExpiry()
  if (!expiry) return false
  const at = Date.parse(expiry)
  return Number.isFinite(at) && at <= now
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
