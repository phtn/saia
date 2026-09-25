import { round2 } from './format'
import type { PremiumBreakdown, PremiumLine } from './types'

/**
 * Philippine non-life taxes on basic premium. These rates reproduce the taxes
 * on the imported motor schedules (`lib/entities/MotorPolicySchedule.json`) to
 * within a centavo: basic ₱22,995 → DST ₱2,874.37, VAT ₱2,759.40, LGT ₱114.98.
 */
export const NON_LIFE_TAXES = [
  { label: 'Documentary stamp tax', rate: 0.125 },
  { label: 'VAT', rate: 0.12 },
  { label: 'Local government tax', rate: 0.005 }
] as const

/** Life premiums carry the 2% premium tax instead of VAT, DST and LGT. */
export const LIFE_TAXES = [{ label: 'Premium tax', rate: 0.02 }] as const

export interface TaxRate {
  readonly label: string
  readonly rate: number
}

/** Sums the coverage lines, applies the taxes, and returns the full breakdown. */
export function buildBreakdown(lines: PremiumLine[], taxRates: readonly TaxRate[], issues: string[] = []): PremiumBreakdown {
  const rounded = lines.map((line) => ({ ...line, amount: round2(line.amount) }))
  const basicPremium = round2(rounded.reduce((sum, line) => sum + line.amount, 0))
  const taxes = taxRates.map((tax) => ({
    label: tax.label,
    amount: round2(basicPremium * tax.rate),
    note: `${(tax.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%`
  }))
  const totalTaxes = round2(taxes.reduce((sum, tax) => sum + tax.amount, 0))
  return { lines: rounded, basicPremium, taxes, totalTaxes, totalAmountDue: round2(basicPremium + totalTaxes), issues }
}

export function emptyBreakdown(issues: string[] = []): PremiumBreakdown {
  return { lines: [], basicPremium: 0, taxes: [], totalTaxes: 0, totalAmountDue: 0, issues }
}
