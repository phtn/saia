export type NoteColor = 'default' | 'coral' | 'peach' | 'sand' | 'mint' | 'sage' | 'fog' | 'storm' | 'dusk' | 'blossom' | 'clay' | 'chalk'

/** A voice recording attached to a note. The audio itself lives in IndexedDB under `id`. */
export interface AudioClip {
  id: string
  duration: number
  mimeType: string
  /** Speech-to-text captured while recording; empty when the browser can't transcribe. */
  transcript: string
  createdDate: string
}

export interface Note {
  id: string
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  archived: boolean
  clips: AudioClip[]
  createdDate: string
  updatedDate: string
}

export type NoteDraft = Pick<Note, 'title' | 'body' | 'color' | 'pinned' | 'clips'>
