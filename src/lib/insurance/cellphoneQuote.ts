/**
 * Cellphone / device quote engine, ported from `lib/js/cellphoneQuote.js`.
 * Coverage rows follow the `CoverageType` entity (`lib/entities/CoverageType.json`).
 */
import coverageRows from '@/lib/entities/CoverageType.json'
import { isoDate, round2, toNumber } from './format'

export type RateMethod = 'percentage_of_fmv' | 'fixed_amount'

export interface CoverageType {
  id: string
  coverage_code: string
  coverage_name: string
  description: string
  coverage_category: string
  coverage_rate: number
  rate_method: RateMethod | string
  min_premium: number
  max_premium: number
  min_eligible_fmv: number
  max_eligible_fmv: number
  effective_from: string
  effective_to: string
  status: string
  approval_status: string
  include_in_all_coverages: boolean
  display_order: number
}

export interface TaxRateRow {
  id: string
  tax_name: string
  tax_rate: number
  calculation_basis: 'coverage_premium' | 'total_amount_due'
  status: string
  approval_status: string
  effective_from: string
  effective_to: string
}

export interface PhoneVariant {
  brand: string
  model: string
  storage: string
  average_fmv: number
  verification_status: 'Verified' | 'Pending' | 'Rejected'
}

export interface CoverageLine {
  coverage: CoverageType
  effective: boolean
  eligible: boolean
  rate: number
  premium: number
  method: string
}

export interface TaxLine {
  tax: TaxRateRow
  rate: number
  amount: number
}

export interface CellphoneQuoteResult {
  coverageLines: CoverageLine[]
  taxLines: TaxLine[]
  totalCoveragePremium: number
  totalTaxes: number
  totalAmountDue: number
  quoteDate: string
}

export interface Effective {
  status: string
  approval_status: string
  effective_from: string
  effective_to: string
}

export const COVERAGE_TYPES: readonly CoverageType[] = (coverageRows as CoverageType[])
  .slice()
  .sort((a, b) => a.display_order - b.display_order)

/**
 * Taxes on device premiums. The legacy engine loaded these from a TaxRate
 * entity; until that is wired to a backend they mirror the non-life taxes.
 */
export const DEVICE_TAXES: readonly TaxRateRow[] = [
  { id: 'dst', tax_name: 'Documentary stamp tax', tax_rate: 0.125, calculation_basis: 'coverage_premium', status: 'Active', approval_status: 'Approved', effective_from: '2026-01-01', effective_to: '' },
  { id: 'vat', tax_name: 'VAT', tax_rate: 0.12, calculation_basis: 'coverage_premium', status: 'Active', approval_status: 'Approved', effective_from: '2026-01-01', effective_to: '' },
  { id: 'lgt', tax_name: 'Local government tax', tax_rate: 0.005, calculation_basis: 'coverage_premium', status: 'Active', approval_status: 'Approved', effective_from: '2026-01-01', effective_to: '' }
]

export type CoveragePackageKey = 'all' | 'od' | 'th' | 'wr' | 'custom'

export interface CoveragePackage {
  key: CoveragePackageKey
  label: string
  description: string
  code?: string
}

export const COVERAGE_PACKAGES: readonly CoveragePackage[] = [
  { key: 'all', label: 'All Coverages', description: 'Every active, eligible coverage in the All Coverages package' },
  { key: 'od', label: 'Own Damage Only', description: 'Own Damage only', code: 'OD' },
  { key: 'th', label: 'Theft Only', description: 'Theft only', code: 'TH' },
  { key: 'wr', label: 'Warranty Only', description: 'Warranty only', code: 'WR' },
  { key: 'custom', label: 'Custom Coverage Selection', description: 'Choose one or more active coverages' }
]

const today = (): string => isoDate()

/** Active, approved, and within its effective window on `onDate`. */
export function isEffective(row: Effective, onDate: string = today()): boolean {
  if (row.status !== 'Active' || row.approval_status !== 'Approved') return false
  if (row.effective_from && onDate < row.effective_from) return false
  if (row.effective_to && onDate > row.effective_to) return false
  return true
}

/** The device's fair market value is inside the coverage's eligible range. */
export function isEligible(coverage: CoverageType, fmv: number): boolean {
  if (coverage.min_eligible_fmv && fmv < coverage.min_eligible_fmv) return false
  if (coverage.max_eligible_fmv && fmv > coverage.max_eligible_fmv) return false
  return true
}

export function coveragePremium(coverage: CoverageType, fmv: number): number {
  let premium = coverage.rate_method === 'fixed_amount' ? toNumber(coverage.coverage_rate) : fmv * toNumber(coverage.coverage_rate)
  if (coverage.min_premium && premium < coverage.min_premium) premium = coverage.min_premium
  if (coverage.max_premium && premium > coverage.max_premium) premium = coverage.max_premium
  return premium
}

/** The coverages a package selects, among those effective on `onDate`. */
export function coveragesForPackage(
  key: CoveragePackageKey,
  custom: readonly string[],
  onDate: string = today(),
  coverages: readonly CoverageType[] = COVERAGE_TYPES
): CoverageType[] {
  const active = coverages.filter((coverage) => isEffective(coverage, onDate))
  if (key === 'all') return active.filter((coverage) => coverage.include_in_all_coverages)
  if (key === 'custom') return active.filter((coverage) => custom.includes(coverage.coverage_code))
  const pkg = COVERAGE_PACKAGES.find((item) => item.key === key)
  return active.filter((coverage) => coverage.coverage_code === pkg?.code)
}

export interface CellphoneQuoteInput {
  fmv: number
  selectedCoverages: readonly CoverageType[]
  taxes?: readonly TaxRateRow[]
  quoteDate?: string
}

export function calculateCellphoneQuote({ fmv, selectedCoverages, taxes = DEVICE_TAXES, quoteDate }: CellphoneQuoteInput): CellphoneQuoteResult {
  const onDate = quoteDate || today()
  const value = toNumber(fmv)
  const coverageLines: CoverageLine[] = []
  let totalCoveragePremium = 0

  for (const coverage of selectedCoverages) {
    const effective = isEffective(coverage, onDate)
    const eligible = isEligible(coverage, value)
    const premium = effective && eligible ? round2(coveragePremium(coverage, value)) : 0
    totalCoveragePremium = round2(totalCoveragePremium + premium)
    coverageLines.push({ coverage, effective, eligible, rate: toNumber(coverage.coverage_rate), premium, method: coverage.rate_method })
  }

  const taxLines: TaxLine[] = []
  let totalTaxes = 0
  for (const tax of taxes.filter((row) => isEffective(row, onDate))) {
    // Both calculation bases apply to the coverage premium, as in the legacy engine.
    const amount = round2(totalCoveragePremium * toNumber(tax.tax_rate))
    totalTaxes = round2(totalTaxes + amount)
    taxLines.push({ tax, rate: toNumber(tax.tax_rate), amount })
  }

  return { coverageLines, taxLines, totalCoveragePremium, totalTaxes, totalAmountDue: round2(totalCoveragePremium + totalTaxes), quoteDate: onDate }
}

export interface CellphoneValidationInput {
  phone: PhoneVariant | null
  fmv: number
  selectedCoverages: readonly CoverageType[]
  taxes?: readonly TaxRateRow[]
  quoteDate?: string
}

/** Human-readable reasons the quote cannot be issued; empty when valid. */
export function validateCellphoneQuote({ phone, fmv, selectedCoverages, taxes = DEVICE_TAXES, quoteDate }: CellphoneValidationInput): string[] {
  const issues: string[] = []
  if (phone === null) issues.push('Select a phone variant.')
  if (selectedCoverages.length === 0) issues.push('Select at least one coverage.')
  if (phone !== null && (!phone.average_fmv || phone.verification_status !== 'Verified')) {
    issues.push('The selected phone has no approved FMV.')
  }
  const onDate = quoteDate || today()
  for (const coverage of selectedCoverages) {
    if (!isEffective(coverage, onDate)) issues.push(`Coverage "${coverage.coverage_name}" has no approved effective rate on the quote date.`)
    if (toNumber(coverage.coverage_rate) < 0) issues.push(`Coverage "${coverage.coverage_name}" has a negative rate.`)
    if (!isEligible(coverage, toNumber(fmv))) issues.push(`The phone FMV is outside the eligible range for "${coverage.coverage_name}".`)
  }
  const effectiveTaxes = taxes.filter((row) => isEffective(row, onDate))
  for (const tax of effectiveTaxes) {
    if (toNumber(tax.tax_rate) < 0) issues.push(`Tax "${tax.tax_name}" has a negative rate.`)
  }
  if (effectiveTaxes.length === 0 && taxes.some((row) => row.status === 'Active')) {
    issues.push('No approved effective tax rate found for the quote date.')
  }
  return issues
}
