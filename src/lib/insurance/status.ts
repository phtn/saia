/** Status chip styling, ported from `lib/js/cellphonePolicyHolder.js` onto this theme's tokens. */
import type { ClaimStatus, PolicyStatus } from './types'

export type Tone = 'neutral' | 'warning' | 'info' | 'success' | 'danger' | 'accent'

export interface StatusMeta {
  label: string
  tone: Tone
  pulse?: boolean
}

export const POLICY_STATUS: Record<PolicyStatus, StatusMeta> = {
  Quote: { label: 'Quote', tone: 'neutral' },
  Pending: { label: 'Pending issuance', tone: 'warning', pulse: true },
  Verified: { label: 'Verified', tone: 'info' },
  Active: { label: 'Active', tone: 'success' },
  Expired: { label: 'Expired', tone: 'neutral' },
  Rejected: { label: 'Rejected', tone: 'danger' },
  Claimed: { label: 'Claimed', tone: 'accent' },
  Cancelled: { label: 'Cancelled', tone: 'neutral' }
}

export const CLAIM_STATUS: Record<ClaimStatus, StatusMeta> = {
  Filed: { label: 'Filed', tone: 'neutral' },
  'Under Review': { label: 'Under review', tone: 'warning', pulse: true },
  Approved: { label: 'Approved', tone: 'info' },
  Denied: { label: 'Denied', tone: 'danger' },
  Paid: { label: 'Paid', tone: 'success' }
}

/** Order of the quote → policy workflow, used to offer the next action. */
export const POLICY_FLOW: PolicyStatus[] = ['Quote', 'Pending', 'Verified', 'Active']

export const TONE_CLASSES: Record<Tone, { chip: string; dot: string; text: string }> = {
  neutral: { chip: 'text-muted-foreground bg-muted border-border/40', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  warning: { chip: 'text-warning bg-warning/10 border-warning/30', dot: 'bg-warning', text: 'text-warning' },
  info: { chip: 'text-info bg-info/10 border-info/30', dot: 'bg-info', text: 'text-info' },
  success: { chip: 'text-success bg-success/10 border-success/30', dot: 'bg-success', text: 'text-success' },
  danger: { chip: 'text-destructive bg-destructive/10 border-destructive/30', dot: 'bg-destructive', text: 'text-destructive' },
  accent: { chip: 'text-accent-brand bg-accent-brand/10 border-accent-brand/30', dot: 'bg-accent-brand', text: 'text-accent-brand' }
}
