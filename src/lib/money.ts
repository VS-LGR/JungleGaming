import Decimal from 'decimal.js'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

function asDecimal(value: string) {
  return new Decimal(value || '0')
}

export function isDecimal(value: string) {
  try {
    if (!/^\d+(\.\d+)?$/.test(value)) return false
    asDecimal(value)
    return true
  } catch {
    return false
  }
}

export function addEth(a: string, b: string) {
  return asDecimal(a).plus(asDecimal(b)).toFixed(3)
}

export function subEth(a: string, b: string) {
  return asDecimal(a).minus(asDecimal(b)).toFixed(3)
}

export function mulEth(price: string, quantity: number) {
  return asDecimal(price).times(quantity).toFixed(3)
}

export function percentEth(amount: string, rate: string) {
  return asDecimal(amount).times(asDecimal(rate)).toFixed(3)
}

export function cmpEth(a: string, b: string) {
  return asDecimal(a).cmp(asDecimal(b))
}

export function formatEth(value: string) {
  const [int, frac] = asDecimal(value).toFixed(3).split('.')
  const trimmed = frac.replace(/0+$/, '')
  const shown = trimmed.length >= 2 ? trimmed : frac.slice(0, 2)
  return `${int}.${shown}`
}

export function formatEthLabel(value: string) {
  return `${formatEth(value)} ETH`
}

export function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}
