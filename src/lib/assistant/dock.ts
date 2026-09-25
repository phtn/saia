/** Open/closed state and transcript of the assistant dock, shared by the topbar and the dock. */
import { useSyncExternalStore } from 'octane'

export interface TranscriptEntry {
  id: number
  role: 'user' | 'assistant'
  text: string
  ok: boolean
}

export interface DockState {
  open: boolean
  transcript: TranscriptEntry[]
}

let state: DockState = { open: false, transcript: [] }
let nextId = 1
const listeners = new Set<() => void>()

function set(next: DockState): void {
  state = next
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => state

export function useDock(): DockState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function setDockOpen(open: boolean): void {
  set({ ...state, open })
}

export function toggleDock(): void {
  set({ ...state, open: !state.open })
}

export function pushTranscript(role: TranscriptEntry['role'], text: string, ok = true): void {
  set({ ...state, transcript: [...state.transcript.slice(-19), { id: nextId++, role, text, ok }] })
}

export function clearTranscript(): void {
  set({ ...state, transcript: [] })
}
