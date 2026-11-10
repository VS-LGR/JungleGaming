export const scenarioNames = [
  'default',
  'empty',
  'slow',
  'variable-latency',
  'out-of-order',
  'offline',
  'server-error',
  'session-expired',
  'register-conflict',
  'coupon-invalid',
  'coupon-expired',
  'price-changed',
  'edition-sold-out',
  'order-timeout',
  'payment-confirmed',
  'payment-refused',
  'favorite-fail',
  'duplicate-event',
  'stale-event',
  'drop-socket',
] as const

export type ScenarioName = (typeof scenarioNames)[number]

export function isScenario(value: string | null): value is ScenarioName {
  return scenarioNames.includes(value as ScenarioName)
}

export function readScenario(): ScenarioName {
  const fromUrl = new URLSearchParams(window.location.search).get('cenario')
  if (isScenario(fromUrl)) {
    localStorage.setItem('kurio-scenario', fromUrl)
    return fromUrl
  }
  const stored = localStorage.getItem('kurio-scenario')
  return isScenario(stored) ? stored : 'default'
}

export function writeScenario(name: ScenarioName) {
  localStorage.setItem('kurio-scenario', name)
}
