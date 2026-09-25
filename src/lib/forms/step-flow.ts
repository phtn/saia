/**
 * Vocabulary of the vertical step pipeline used by every form, ported from
 * livesnaps' verification flow (`src/lib/verifications/step-flow.ts`).
 */
import type { FieldDef, FormValues } from '@/lib/insurance/types'

/**
 * A step is `done` once settled, `active` while it is the next thing to do,
 * and `idle` while an earlier step still blocks it.
 */
export type StepState = 'idle' | 'active' | 'done'

export const STEP_TILE_CLASS = {
  idle: 'border border-border bg-muted/60 text-muted-foreground/60',
  active: 'bg-active text-white shadow-[0_1px_2px_-1px_var(--active)]',
  done: 'border border-flow-done bg-flow-done text-white'
} as const satisfies Record<StepState, string>

export const STEP_TITLE_CLASS = {
  idle: 'text-muted-foreground/60',
  active: 'text-foreground',
  done: 'text-foreground'
} as const satisfies Record<StepState, string>

/** Settling one step often settles the next; the stagger shows that as a run down the rail. */
export const STEP_FLOW_MS = 110

/** Every branch that swaps in when a step settles enters the same way. */
export const ENTER_CLASS = 'animate-in fade-in-0 slide-in-from-top-1 duration-300 ease-out motion-reduce:animate-none'

const RANK_TONES = ['bg-active', 'bg-violet-500', 'bg-pink-500'] as const
const RANK_TEXT_TONES = ['text-active', 'text-violet-500', 'text-pink-500'] as const

export const rankTone = (index: number) => RANK_TONES[index % RANK_TONES.length]
export const rankTextTone = (index: number) => RANK_TEXT_TONES[index % RANK_TEXT_TONES.length]

export const fieldLabelClassName = 'font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground'
export const readonlyFieldClassName = 'flex h-10 items-center truncate rounded-md border border-border bg-muted/50 px-3 font-mono text-xs text-muted-foreground'

/** Required, non-boolean fields that are still empty. */
export function missingFields(fields: readonly FieldDef[], values: FormValues): FieldDef[] {
  return fields.filter((field) => {
    if (!field.required || field.type === 'boolean') return false
    const value = values[field.key]
    return typeof value !== 'string' || value.trim() === ''
  })
}

/**
 * States for a run of steps given whether each one is complete: complete steps
 * are `done`, the first incomplete one is `active`, the rest wait as `idle`.
 */
export function stepStates(complete: readonly boolean[]): StepState[] {
  const firstOpen = complete.indexOf(false)
  return complete.map((isDone, index) => (isDone ? 'done' : index === firstOpen ? 'active' : 'idle'))
}
