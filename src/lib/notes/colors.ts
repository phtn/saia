import type { NoteColor } from './types'

/** Google Keep's pastel palette, mixed into the card colour so it stays legible in both themes. */
export const NOTE_COLORS: Record<NoteColor, { label: string; hex: string | null }> = {
  default: { label: 'Default', hex: null },
  coral: { label: 'Coral', hex: '#f28b82' },
  peach: { label: 'Peach', hex: '#fbbc04' },
  sand: { label: 'Sand', hex: '#fff475' },
  mint: { label: 'Mint', hex: '#ccff90' },
  sage: { label: 'Sage', hex: '#a7ffeb' },
  fog: { label: 'Fog', hex: '#cbf0f8' },
  storm: { label: 'Storm', hex: '#aecbfa' },
  dusk: { label: 'Dusk', hex: '#d7aefb' },
  blossom: { label: 'Blossom', hex: '#fdcfe8' },
  clay: { label: 'Clay', hex: '#e6c9a8' },
  chalk: { label: 'Chalk', hex: '#e8eaed' }
}

export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[]

/** Background for a note surface; `--note-mix` is tuned per theme in style.css. */
export function noteBackground(color: NoteColor): string | undefined {
  const hex = NOTE_COLORS[color].hex
  return hex === null ? undefined : `color-mix(in oklch, ${hex} var(--note-mix), var(--card))`
}

/** Swatch fill for the colour picker. */
export function swatchBackground(color: NoteColor): string {
  return noteBackground(color) ?? 'var(--card)'
}
