/**
 * Money, percentage and date formatting shared by every insurance screen.
 * Ported from `lib/js/cellphoneQuote.js`, `claimMoney.js`, `salesAnalytics.js`
 * and `financeCurrency.js`.
 */

export type Numeric = number | string | null | undefined

export const DEFAULT_CURRENCY = 'PHP'

export const SUPPORTED_CURRENCIES = [
  'PHP', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'AUD', 'CAD', 'SGD',
  'HKD', 'AED', 'CHF', 'CNY', 'INR', 'THB', 'MYR', 'IDR', 'VND'
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export function toNumber(value: Numeric): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Rounds to centavos, avoiding binary drift (e.g. 1.005 → 1.01). */
export function round2(value: Numeric): number {
  const n = toNumber(value)
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** `₱12,345.60` */
export function peso(value: Numeric): string {
  return '₱' + toNumber(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** `₱1.25M`, `₱12.40K`, `₱950.00` */
export function pesoCompact(value: Numeric): string {
  const n = toNumber(value)
  const abs = Math.abs(n)
  if (abs >= 1e6) return '₱' + (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '₱' + (n / 1e3).toFixed(2) + 'K'
  return '₱' + n.toFixed(2)
}

export function currency(value: Numeric, code: CurrencyCode = DEFAULT_CURRENCY): string {
  const n = toNumber(value)
  try {
    return n.toLocaleString(undefined, { style: 'currency', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return `${code} ${n.toFixed(2)}`
  }
}

/** A rate stored as a fraction (0.035) shown as a trimmed percent (`3.5%`). */
export function rate(value: Numeric): string {
  return (toNumber(value) * 100).toFixed(4).replace(/\.?0+$/, '') + '%'
}

/** A ratio shown with one decimal (`42.3%`). */
export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : (value * 100).toFixed(1) + '%'
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `Sep 25, 2026` */
export function shortDate(value: string | Date | null | undefined): string {
  const date = parseDate(value)
  return date === null ? '—' : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
}

/** `Sep 25, 2026, 09:30 AM` */
export function dateTime(value: string | Date | null | undefined): string {
  const date = parseDate(value)
  return date === null
    ? '—'
    : date.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** `YYYY-MM-DD` in local time. */
export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Adds months, clamping to the last day when the target month is shorter. */
export function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

/** Whole days from `from` to `to` (local calendar days). */
export function daysBetween(from: string | Date, to: string | Date): number {
  const a = parseDate(from)
  const b = parseDate(to)
  if (a === null || b === null) return 0
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((end - start) / 864e5)
}

export function ageFrom(birthdate: string | null | undefined, on: Date = new Date()): number | null {
  const date = parseDate(birthdate)
  if (date === null) return null
  let age = on.getFullYear() - date.getFullYear()
  const beforeBirthday = on.getMonth() < date.getMonth() || (on.getMonth() === date.getMonth() && on.getDate() < date.getDate())
  if (beforeBirthday) age -= 1
  return age
}
