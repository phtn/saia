/**
 * Local book of business: quotes/policies, claims and reminders.
 *
 * State lives in memory, persists to localStorage, and is read with
 * `useStore(selector)`. The mutation functions are the seam where a backend
 * (the legacy Base44 entities, or a new API) plugs in later; the voice
 * assistant calls the same functions the UI does.
 */
import { useSyncExternalStore } from 'octane'
import { isoDate } from './format'
import { seedClaims, seedQuotes, seedReminders } from './seed'
import type { ClaimRecord, ClaimStatus, PolicyStatus, QuoteRecord, ReminderTask } from './types'

export interface StoreState {
  quotes: QuoteRecord[]
  claims: ClaimRecord[]
  reminders: ReminderTask[]
}

const STORAGE_KEY = 'saia-book-v1'

function initialState(): StoreState {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (isStoreState(parsed)) return parsed
    }
  } catch {
    // Unreadable storage falls back to the sample book.
  }
  const quotes = seedQuotes()
  return { quotes, claims: seedClaims(quotes), reminders: seedReminders(quotes) }
}

function isStoreState(value: unknown): value is StoreState {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.quotes) && Array.isArray(record.claims) && Array.isArray(record.reminders)
}

let state: StoreState = initialState()
const listeners = new Set<() => void>()

function commit(next: StoreState): void {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The session still works without persistence.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = (): StoreState => state

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getState(): StoreState {
  return state
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function saveQuote(input: Omit<QuoteRecord, 'id' | 'createdDate' | 'updatedDate'> & { id?: string }): QuoteRecord {
  const now = new Date().toISOString()
  const existing = input.id ? state.quotes.find((quote) => quote.id === input.id) : undefined
  const record: QuoteRecord = { ...input, id: existing?.id ?? newId('quote'), createdDate: existing?.createdDate ?? now, updatedDate: now }
  const quotes = existing ? state.quotes.map((quote) => (quote.id === record.id ? record : quote)) : [record, ...state.quotes]
  commit({ ...state, quotes })
  return record
}

function policyNumberFor(quote: QuoteRecord): string {
  return `${quote.product.slice(0, 2).toUpperCase()}-${isoDate().replace(/-/g, '').slice(2)}-${String(Math.floor(Math.random() * 1e5)).padStart(5, '0')}`
}

export function setQuoteStatus(id: string, status: PolicyStatus): void {
  const now = new Date().toISOString()
  commit({
    ...state,
    quotes: state.quotes.map((quote) => {
      if (quote.id !== id) return quote
      const needsNumber = (status === 'Verified' || status === 'Active') && quote.policyNumber === ''
      return { ...quote, status, policyNumber: needsNumber ? policyNumberFor(quote) : quote.policyNumber, updatedDate: now }
    })
  })
}

export function deleteQuote(id: string): void {
  commit({ ...state, quotes: state.quotes.filter((quote) => quote.id !== id) })
}

export function saveClaim(input: Omit<ClaimRecord, 'id' | 'claimNumber' | 'createdDate' | 'updatedDate'>): ClaimRecord {
  const now = new Date().toISOString()
  const record: ClaimRecord = { ...input, id: newId('claim'), claimNumber: `CLM-${String(26000 + state.claims.length + 1).padStart(6, '0')}`, createdDate: now, updatedDate: now }
  const quotes = state.quotes.map((quote) => (quote.id === input.quoteId && quote.status === 'Active' ? { ...quote, status: 'Claimed' as const, updatedDate: now } : quote))
  commit({ ...state, quotes, claims: [record, ...state.claims] })
  return record
}

export function setClaimStatus(id: string, status: ClaimStatus): void {
  const now = new Date().toISOString()
  commit({ ...state, claims: state.claims.map((claim) => (claim.id === id ? { ...claim, status, updatedDate: now } : claim)) })
}

export function addReminder(input: Omit<ReminderTask, 'id' | 'done'>): ReminderTask {
  const record: ReminderTask = { ...input, id: newId('rem'), done: false }
  commit({ ...state, reminders: [...state.reminders, record] })
  return record
}

export function toggleReminder(id: string): void {
  commit({ ...state, reminders: state.reminders.map((item) => (item.id === id ? { ...item, done: !item.done } : item)) })
}

/** Restores the sample book (useful for demos). */
export function resetStore(): void {
  const quotes = seedQuotes()
  commit({ quotes, claims: seedClaims(quotes), reminders: seedReminders(quotes) })
}
