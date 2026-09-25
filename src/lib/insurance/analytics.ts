/**
 * Book analytics, ported from `lib/js/salesAnalytics.js` and `lossAnalytics.js`.
 */
import { claimLoss } from './claims'
import { round2 } from './format'
import { PRODUCTS } from './products'
import type { ClaimRecord, ProductId, QuoteRecord } from './types'

const WON: ReadonlySet<string> = new Set(['Verified', 'Active', 'Claimed', 'Expired'])
const IN_FORCE: ReadonlySet<string> = new Set(['Verified', 'Active', 'Claimed'])

export interface BookKpis {
  quotes: number
  policies: number
  inForce: number
  writtenPremium: number
  pendingPremium: number
  conversion: number | null
  claimsOpen: number
  claimsPaid: number
  lossRatio: number | null
}

export function bookKpis(quotes: readonly QuoteRecord[], claims: readonly ClaimRecord[]): BookKpis {
  const won = quotes.filter((quote) => WON.has(quote.status))
  const writtenPremium = round2(won.reduce((sum, quote) => sum + quote.premium.totalAmountDue, 0))
  const pendingPremium = round2(quotes.filter((quote) => quote.status === 'Pending').reduce((sum, quote) => sum + quote.premium.totalAmountDue, 0))
  const losses = round2(claims.filter((claim) => claim.status !== 'Denied').reduce((sum, claim) => sum + claimLoss(claim), 0))
  const basic = won.reduce((sum, quote) => sum + quote.premium.basicPremium, 0)
  return {
    quotes: quotes.length,
    policies: won.length,
    inForce: quotes.filter((quote) => IN_FORCE.has(quote.status)).length,
    writtenPremium,
    pendingPremium,
    conversion: quotes.length > 0 ? won.length / quotes.length : null,
    claimsOpen: claims.filter((claim) => claim.status === 'Filed' || claim.status === 'Under Review' || claim.status === 'Approved').length,
    claimsPaid: round2(claims.filter((claim) => claim.status === 'Paid').reduce((sum, claim) => sum + claimLoss(claim), 0)),
    lossRatio: basic > 0 ? losses / basic : null
  }
}

export interface ProductMix {
  product: ProductId
  label: string
  quotes: number
  policies: number
  premium: number
  share: number
}

export function productMix(quotes: readonly QuoteRecord[]): ProductMix[] {
  const rows = new Map<ProductId, ProductMix>()
  for (const quote of quotes) {
    const row = rows.get(quote.product) ?? { product: quote.product, label: PRODUCTS[quote.product].label, quotes: 0, policies: 0, premium: 0, share: 0 }
    row.quotes += 1
    if (WON.has(quote.status)) {
      row.policies += 1
      row.premium += quote.premium.totalAmountDue
    }
    rows.set(quote.product, row)
  }
  const total = [...rows.values()].reduce((sum, row) => sum + row.premium, 0)
  return [...rows.values()]
    .map((row) => ({ ...row, premium: round2(row.premium), share: total > 0 ? row.premium / total : 0 }))
    .sort((a, b) => b.premium - a.premium || b.quotes - a.quotes)
}

/** Policies expiring within `days`, soonest first. */
export function renewalsDue(quotes: readonly QuoteRecord[], days = 45, now: Date = new Date()): QuoteRecord[] {
  const limit = new Date(now)
  limit.setDate(limit.getDate() + days)
  return quotes
    .filter((quote) => IN_FORCE.has(quote.status) && quote.inceptionTo !== '')
    .filter((quote) => {
      const end = new Date(quote.inceptionTo)
      return end >= now && end <= limit
    })
    .sort((a, b) => a.inceptionTo.localeCompare(b.inceptionTo))
}

// ---------------------------------------------------------------------------
// Imported motor schedules (`lib/entities/MotorPolicySchedule.json`)

export interface MotorScheduleRow {
  id: string
  policy_number: string | null
  insured_name_as_printed: string | null
  insurer_name_as_printed: string | null
  date_issued: string | null
  coverage_start_date: string | null
  coverage_end_date: string | null
  basic_premium: number | null
  total_amount_due: number | null
  documentary_stamp_tax: number | null
  vat_amount: number | null
  local_government_tax: number | null
  record_status: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  own_damage_theft_included: boolean | null
  is_renewal: boolean | null
}

export interface MonthlyPoint {
  month: string
  label: string
  policies: number
  premium: number
}

export interface MotorBook {
  policies: number
  premium: number
  basicPremium: number
  taxes: number
  avgPremium: number
  monthly: MonthlyPoint[]
  weekday: { day: string; policies: number }[]
  expiringSoon: number
  premiumBands: { label: string; policies: number }[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function motorBook(rows: readonly MotorScheduleRow[], now: Date = new Date()): MotorBook {
  const live = rows.filter((row) => row.record_status !== 'Archived' && row.record_status !== 'Cancelled')
  const premium = round2(live.reduce((sum, row) => sum + (row.total_amount_due ?? 0), 0))
  const basicPremium = round2(live.reduce((sum, row) => sum + (row.basic_premium ?? 0), 0))
  const monthly = new Map<string, MonthlyPoint>()
  const weekday = [0, 0, 0, 0, 0, 0, 0]
  for (const row of live) {
    if (!row.date_issued) continue
    const key = row.date_issued.slice(0, 7)
    const point = monthly.get(key) ?? {
      month: key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      policies: 0,
      premium: 0
    }
    point.policies += 1
    point.premium = round2(point.premium + (row.total_amount_due ?? 0))
    monthly.set(key, point)
    weekday[new Date(`${row.date_issued}T00:00:00`).getDay()] += 1
  }
  const soon = new Date(now)
  soon.setDate(soon.getDate() + 60)
  const bands = [
    { label: '< ₱5K', max: 5000 },
    { label: '₱5–15K', max: 15000 },
    { label: '₱15–30K', max: 30000 },
    { label: '₱30–60K', max: 60000 },
    { label: '₱60K+', max: Infinity }
  ]
  return {
    policies: live.length,
    premium,
    basicPremium,
    taxes: round2(premium - basicPremium),
    avgPremium: live.length > 0 ? round2(premium / live.length) : 0,
    monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
    weekday: WEEKDAYS.map((day, index) => ({ day, policies: weekday[index] })),
    expiringSoon: live.filter((row) => {
      if (!row.coverage_end_date) return false
      const end = new Date(row.coverage_end_date)
      return end >= now && end <= soon
    }).length,
    premiumBands: bands.map((band, index) => ({
      label: band.label,
      policies: live.filter((row) => {
        const due = row.total_amount_due ?? 0
        return due >= (index === 0 ? 0 : bands[index - 1].max) && due < band.max
      }).length
    }))
  }
}
