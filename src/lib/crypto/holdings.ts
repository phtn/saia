/**
 * Shadow portfolio: coins and amounts the user enters to simulate what their
 * holdings are worth at live prices. Nothing here touches a real wallet.
 */
import { useSyncExternalStore } from 'octane'

export interface Holding {
  id: string
  coinId: number
  symbol: string
  name: string
  amount: number
  note: string
  createdDate: string
}

const STORAGE_KEY = 'saia-holdings-v1'

function initial(): Holding[] {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Holding[]) : []
  } catch {
    return []
  }
}

let holdings: Holding[] = initial()
const listeners = new Set<() => void>()

function commit(next: Holding[]): void {
  holdings = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  } catch {
    // Works for the session without persistence.
  }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => holdings

export function useHoldings(): Holding[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Adds to an existing position in the same coin, or opens a new one. */
export function addHolding(input: Omit<Holding, 'id' | 'createdDate'>): void {
  const existing = holdings.find((holding) => holding.coinId === input.coinId)
  if (existing) {
    commit(holdings.map((holding) => (holding.id === existing.id ? { ...holding, amount: holding.amount + input.amount, note: input.note || holding.note } : holding)))
    return
  }
  commit([...holdings, { ...input, id: `holding-${Date.now().toString(36)}`, createdDate: new Date().toISOString() }])
}

export function setHoldingAmount(id: string, amount: number): void {
  commit(holdings.map((holding) => (holding.id === id ? { ...holding, amount } : holding)))
}

export function removeHolding(id: string): void {
  commit(holdings.filter((holding) => holding.id !== id))
}
