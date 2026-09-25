/**
 * Notes: Keep-style cards with dictated text and voice recordings.
 * Note records persist to localStorage; clip audio lives in IndexedDB (see audio-db.ts).
 */
import { useSyncExternalStore } from 'octane'
import { deleteClipAudio } from './audio-db'
import type { AudioClip, Note, NoteDraft } from './types'

const STORAGE_KEY = 'saia-notes-v1'

function initialNotes(): Note[] {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Note[]
    }
  } catch {
    // Unreadable storage starts an empty board.
  }
  return []
}

let notes: Note[] = initialNotes()
const listeners = new Set<() => void>()

function commit(next: Note[]): void {
  notes = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // The session still works without persistence.
  }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => notes

export function useNotes(): Note[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const isBlank = (draft: Pick<NoteDraft, 'title' | 'body' | 'clips'>) => draft.title.trim() === '' && draft.body.trim() === '' && draft.clips.length === 0

export function createNote(draft: NoteDraft): Note {
  const now = new Date().toISOString()
  const note: Note = { ...draft, id: newId('note'), archived: false, createdDate: now, updatedDate: now }
  commit([note, ...notes])
  return note
}

export function updateNote(id: string, patch: Partial<Omit<Note, 'id' | 'createdDate'>>): void {
  commit(notes.map((note) => (note.id === id ? { ...note, ...patch, updatedDate: new Date().toISOString() } : note)))
}

export function deleteNote(id: string): void {
  const note = notes.find((item) => item.id === id)
  for (const clip of note?.clips ?? []) void deleteClipAudio(clip.id)
  commit(notes.filter((item) => item.id !== id))
}

export function addClip(noteId: string, clip: AudioClip): void {
  const note = notes.find((item) => item.id === noteId)
  if (note) updateNote(noteId, { clips: [...note.clips, clip] })
}

export function removeClip(noteId: string, clipId: string): void {
  const note = notes.find((item) => item.id === noteId)
  if (!note) return
  void deleteClipAudio(clipId)
  updateNote(noteId, { clips: note.clips.filter((clip) => clip.id !== clipId) })
}

/** Append a dictated phrase to the body, reading the latest note so rapid phrases don't overwrite each other. */
export function appendToBody(noteId: string, text: string): void {
  const note = notes.find((item) => item.id === noteId)
  if (note) updateNote(noteId, { body: joinText(note.body, text) })
}

export const joinText = (body: string, text: string) => (body.trim() === '' ? text : `${body.replace(/\s+$/, '')} ${text}`)
