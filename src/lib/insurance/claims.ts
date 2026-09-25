/** Claim money helpers, ported from `lib/js/claimMoney.js` and `lossAnalytics.js`. */
import { round2 } from './format'
import type { ClaimItem, ClaimRecord, ProductId } from './types'

export const totalClaimed = (items: readonly ClaimItem[]): number => round2(items.reduce((sum, item) => sum + (item.amountClaimed || 0), 0))

export const totalAssessed = (items: readonly ClaimItem[]): number => round2(items.reduce((sum, item) => sum + (item.amountAssessed || 0), 0))

/** Loss amount: the assessed total once assessed, otherwise the claimed total. */
export const claimLoss = (claim: ClaimRecord): number => {
  const assessed = totalAssessed(claim.items)
  return assessed > 0 ? assessed : totalClaimed(claim.items)
}

export const INCIDENT_TYPES: Record<ProductId, readonly string[]> = {
  motor: ['Collision', 'Theft / carnapping', 'Flood / typhoon', 'Fire', 'Third-party injury', 'Third-party property damage'],
  ctpl: ['Third-party death', 'Third-party injury'],
  mobile: ['Accidental damage', 'Liquid damage', 'Theft', 'Mechanical breakdown'],
  travel: ['Medical emergency', 'Trip cancellation', 'Flight delay', 'Lost baggage', 'Travel document loss'],
  'personal-accident': ['Accidental injury', 'Accidental death', 'Permanent disablement'],
  commercial: ['Fire', 'Typhoon / flood', 'Burglary', 'Third-party liability', 'Business interruption'],
  pet: ['Illness', 'Accident', 'Surgery'],
  life: ['Death', 'Terminal illness'],
  home: ['Fire', 'Typhoon / flood', 'Earthquake', 'Burglary']
}

/** Documents the adjuster needs, per product. */
export const CLAIM_REQUIREMENTS: Record<ProductId, readonly string[]> = {
  motor: ['Police / traffic report', 'Driver’s license & OR/CR', 'Photos of damage', 'Repair estimate'],
  ctpl: ['Police report', 'Medical certificate or death certificate', 'OR/CR'],
  mobile: ['Photo of the damaged device', 'Proof of purchase', 'Police report (theft)', 'IMEI blocking confirmation (theft)'],
  travel: ['Passport & boarding pass', 'Medical report and receipts', 'Airline delay / PIR certificate'],
  'personal-accident': ['Medical certificate', 'Hospital receipts', 'Police report (if any)'],
  commercial: ['Fire / police report', 'Inventory of loss', 'Photos', 'Financial statements (BI)'],
  pet: ['Vet diagnosis', 'Vet receipts'],
  life: ['Death certificate', 'Claimant’s ID', 'Attending physician’s statement'],
  home: ['Photos of damage', 'Barangay / fire report', 'Repair estimate']
}
