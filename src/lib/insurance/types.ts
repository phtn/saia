import type { IconName } from '@/lib/icons'

/** Every line of business the dashboard can quote. */
export type ProductId =
  | 'motor'
  | 'ctpl'
  | 'mobile'
  | 'travel'
  | 'personal-accident'
  | 'commercial'
  | 'pet'
  | 'life'
  | 'home'

export type FieldType = 'text' | 'email' | 'tel' | 'number' | 'money' | 'date' | 'select' | 'textarea' | 'boolean'

export type FieldValue = string | boolean

export type FormValues = Record<string, FieldValue>

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: readonly string[]
  required?: boolean
  placeholder?: string
  hint?: string
  min?: number
  max?: number
  /** Occupy both columns of the two-column form grid. */
  wide?: boolean
  /** Extra spoken names the voice assistant should accept for this field. */
  aliases?: readonly string[]
  /** Extra TanStack validation after the required check; return an error message or undefined. */
  validate?: (value: FieldValue, values: FormValues) => string | undefined
  /** Re-run `validate` when these sibling fields change (TanStack `onChangeListenTo`). */
  dependsOn?: readonly string[]
}

export interface FormSection {
  id: string
  title: string
  description?: string
  fields: readonly FieldDef[]
}

export interface PremiumLine {
  label: string
  amount: number
  note?: string
}

export interface PremiumBreakdown {
  lines: PremiumLine[]
  basicPremium: number
  taxes: PremiumLine[]
  totalTaxes: number
  totalAmountDue: number
  /** Blocking problems; a quote cannot be saved while any exist. */
  issues: string[]
}

export interface ProductDefinition {
  id: ProductId
  label: string
  /** The `product_type` string used by the legacy QuoteRecord entity. */
  legacyType: string
  icon: IconName
  tagline: string
  /** Risk-detail sections shown after the shared client step. */
  sections: readonly FormSection[]
  /** Starting values for the product's own fields. */
  defaults: FormValues
  /** Indicative premium from the form values. */
  rate: (values: FormValues) => PremiumBreakdown
  /** The form value that names the insured risk (vehicle, device, destination…). */
  describeRisk: (values: FormValues) => string
}

/** Lifecycle of a quote/policy, from `lib/js/qouteRecordFields.js` and `cellphonePolicyHolder.js`. */
export type PolicyStatus = 'Quote' | 'Pending' | 'Verified' | 'Active' | 'Expired' | 'Rejected' | 'Claimed' | 'Cancelled'

export interface ClientInfo {
  name: string
  mobile: string
  email: string
  birthdate: string
  address: string
}

export interface QuoteRecord {
  id: string
  product: ProductId
  status: PolicyStatus
  client: ClientInfo
  values: FormValues
  premium: PremiumBreakdown
  risk: string
  insurer: string
  policyNumber: string
  inceptionFrom: string
  inceptionTo: string
  agent: string
  createdDate: string
  updatedDate: string
  notes: string
}

export type ClaimStatus = 'Filed' | 'Under Review' | 'Approved' | 'Denied' | 'Paid'

export interface ClaimItem {
  description: string
  amountClaimed: number
  amountAssessed: number
}

export interface ClaimRecord {
  id: string
  claimNumber: string
  quoteId: string
  policyNumber: string
  product: ProductId
  claimant: string
  incidentDate: string
  incidentType: string
  description: string
  location: string
  items: ClaimItem[]
  status: ClaimStatus
  createdDate: string
  updatedDate: string
}

export type MessageChannel = 'WhatsApp' | 'Viber' | 'Messenger' | 'SMS' | 'Email'

export interface ReminderTask {
  id: string
  title: string
  dueDatetime: string
  location: string
  notes: string
  quoteId: string
  done: boolean
}
