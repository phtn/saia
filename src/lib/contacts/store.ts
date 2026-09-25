/**
 * Contacts and crypto wallet addresses (yours and your contacts').
 * Persists to localStorage like the book store. Only public addresses are kept.
 */
import { useSyncExternalStore } from 'octane'
import type { Contact, Wallet } from './types'

export interface ContactsState {
  contacts: Contact[]
  wallets: Wallet[]
}

const STORAGE_KEY = 'saia-contacts-v1'

function initialState(): ContactsState {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ContactsState>
      if (Array.isArray(parsed.contacts) && Array.isArray(parsed.wallets)) return { contacts: parsed.contacts, wallets: parsed.wallets }
    }
  } catch {
    // Unreadable storage starts empty.
  }
  return { contacts: [], wallets: [] }
}

let state: ContactsState = initialState()
const listeners = new Set<() => void>()

function commit(next: ContactsState): void {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The session still works without persistence.
  }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => state

export function useContacts(): ContactsState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export type ContactInput = Omit<Contact, 'id' | 'createdDate' | 'updatedDate' | 'favorite'>

export function addContact(input: ContactInput): Contact {
  const now = new Date().toISOString()
  const contact: Contact = { ...input, id: newId('contact'), favorite: false, createdDate: now, updatedDate: now }
  commit({ ...state, contacts: [contact, ...state.contacts] })
  return contact
}

export function updateContact(id: string, patch: Partial<ContactInput & { favorite: boolean }>): void {
  commit({ ...state, contacts: state.contacts.map((contact) => (contact.id === id ? { ...contact, ...patch, updatedDate: new Date().toISOString() } : contact)) })
}

/** Removes the contact and the wallet addresses saved for them. */
export function deleteContact(id: string): void {
  commit({ contacts: state.contacts.filter((contact) => contact.id !== id), wallets: state.wallets.filter((wallet) => wallet.owner !== id) })
}

export function addWallet(input: Omit<Wallet, 'id' | 'createdDate'>): Wallet {
  const wallet: Wallet = { ...input, address: input.address.trim(), id: newId('wallet'), createdDate: new Date().toISOString() }
  commit({ ...state, wallets: [wallet, ...state.wallets] })
  return wallet
}

export function deleteWallet(id: string): void {
  commit({ ...state, wallets: state.wallets.filter((wallet) => wallet.id !== id) })
}

/** An address already saved on the same chain, if any. */
export function duplicateWallet(chain: string, address: string): Wallet | undefined {
  const value = address.trim()
  // EVM hex addresses are case-insensitive; base58/bech32 ones are compared exactly.
  const same = (saved: string) => (value.startsWith('0x') ? saved.toLowerCase() === value.toLowerCase() : saved === value)
  return state.wallets.find((wallet) => wallet.chain === chain && same(wallet.address))
}
