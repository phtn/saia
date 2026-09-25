/**
 * Voice assistant groundwork.
 *
 * Screens register what the assistant may do while they are mounted:
 *  - commands: named actions matched from an utterance ("new motor quote")
 *  - forms: a bridge that lets the assistant read and fill fields by their
 *    spoken label ("set declared value to 850 thousand"), step through a
 *    workflow ("next") and submit it.
 *
 * `interpret()` turns one utterance (typed now, transcribed speech later, or an
 * LLM tool call) into one of those actions. Replacing the rule-based matcher
 * with a model only needs a new `interpret`; the registry stays the same.
 */
import { useEffect, useSyncExternalStore } from 'octane'
import type { FieldDef, FieldValue } from '@/lib/insurance/types'

export interface CommandContext {
  utterance: string
  /** Named groups captured by the command's pattern. */
  params: Record<string, string>
}

export interface AssistantCommand {
  id: string
  title: string
  /** Shown in the assistant's suggestions. */
  examples: readonly string[]
  patterns: readonly RegExp[]
  run: (context: CommandContext) => string | void
}

export interface FormBridge {
  id: string
  title: string
  fields: () => readonly FieldDef[]
  getValue: (key: string) => FieldValue | undefined
  setValue: (key: string, value: FieldValue) => void
  next?: () => string | void
  back?: () => string | void
  submit?: () => string | void
}

export interface AssistantReply {
  ok: boolean
  message: string
}

interface RegistryState {
  commands: AssistantCommand[]
  forms: FormBridge[]
}

let registry: RegistryState = { commands: [], forms: [] }
const listeners = new Set<() => void>()

function update(next: RegistryState): void {
  registry = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = (): RegistryState => registry

export function useAssistantRegistry(): RegistryState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function registerCommands(commands: readonly AssistantCommand[]): () => void {
  const ids = new Set(commands.map((command) => command.id))
  update({ ...registry, commands: [...registry.commands.filter((command) => !ids.has(command.id)), ...commands] })
  return () => update({ ...registry, commands: registry.commands.filter((command) => !commands.includes(command)) })
}

export function registerForm(form: FormBridge): () => void {
  update({ ...registry, forms: [...registry.forms.filter((item) => item.id !== form.id), form] })
  return () => update({ ...registry, forms: registry.forms.filter((item) => item !== form) })
}

/** Registers commands for the lifetime of the calling component. */
export function useAssistantCommands(commands: readonly AssistantCommand[]): void {
  useEffect(() => registerCommands(commands), [commands])
}

/** Exposes a form to the assistant for the lifetime of the calling component. */
export function useAssistantForm(form: FormBridge): void {
  useEffect(() => registerForm(form), [form])
}

// ---------------------------------------------------------------------------
// Interpretation

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@.+\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const WORD_NUMBERS: Record<string, number> = { thousand: 1e3, k: 1e3, million: 1e6, m: 1e6, hundred: 1e2 }

/** "850 thousand" → "850000", "1.2 million" → "1200000", "₱12,500" → "12500". */
export function spokenNumber(text: string): string | null {
  const match = normalize(text).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(thousand|million|hundred|k|m)?\b/)
  if (!match) return null
  const value = Number(match[1]) * (match[2] ? WORD_NUMBERS[match[2]] : 1)
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : null
}

/** Coerces spoken text to the field's value type, or returns an error message. */
export function coerceFieldValue(field: FieldDef, raw: string): { value: FieldValue } | { error: string } {
  const text = raw.trim()
  switch (field.type) {
    case 'boolean': {
      if (/^(yes|on|true|include|add|with|enable)/i.test(text)) return { value: true }
      if (/^(no|off|false|exclude|remove|without|disable)/i.test(text)) return { value: false }
      return { error: `Say yes or no for ${field.label}.` }
    }
    case 'money':
    case 'number': {
      const value = spokenNumber(text)
      return value === null ? { error: `I didn't catch a number for ${field.label}.` } : { value }
    }
    case 'date': {
      const date = new Date(text)
      if (Number.isNaN(date.getTime())) return { error: `Give ${field.label} as a date, like March 4 2026.` }
      const y = date.getFullYear()
      return { value: `${y}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
    }
    case 'select': {
      const options = field.options ?? []
      const wanted = normalize(text)
      const option = options.find((item) => normalize(item) === wanted) ?? options.find((item) => normalize(item).includes(wanted) || wanted.includes(normalize(item).split(' ')[0]))
      return option ? { value: option } : { error: `${field.label} can be: ${options.join(', ')}.` }
    }
    default:
      return { value: text }
  }
}

/** Finds the field an utterance names, preferring the longest matching label or alias. */
export function findField(fields: readonly FieldDef[], spoken: string): FieldDef | null {
  const wanted = normalize(spoken)
  let best: { field: FieldDef; score: number } | null = null
  for (const field of fields) {
    for (const name of [field.label, field.key.replace(/_/g, ' '), ...(field.aliases ?? [])]) {
      const candidate = normalize(name)
      if (candidate === wanted) return field
      if (wanted.includes(candidate) || candidate.includes(wanted)) {
        const score = candidate.length
        if (best === null || score > best.score) best = { field, score }
      }
    }
  }
  return best?.field ?? null
}

const SET_FIELD = /^(?:set|fill|enter|put|change|update|make)\s+(?:the\s+)?(.+?)\s+(?:to|as|=|is)\s+(.+)$/i
const FIELD_IS = /^(?:the\s+)?(.+?)\s+is\s+(.+)$/i

export function interpret(utterance: string, state: RegistryState = registry): AssistantReply {
  const text = utterance.trim().replace(/[.!?]+$/, '')
  if (text === '') return { ok: false, message: 'Say or type a command.' }
  const form = state.forms[state.forms.length - 1]

  if (form) {
    if (/^(next|continue|next step|go on)$/i.test(text) && form.next) return { ok: true, message: form.next() ?? 'Next step.' }
    if (/^(back|previous|go back|previous step)$/i.test(text) && form.back) return { ok: true, message: form.back() ?? 'Previous step.' }
    if (/^(submit|save|save quote|done|finish)$/i.test(text) && form.submit) return { ok: true, message: form.submit() ?? 'Submitted.' }

    const match = text.match(SET_FIELD) ?? text.match(FIELD_IS)
    if (match) {
      const field = findField(form.fields(), match[1])
      if (field) {
        const coerced = coerceFieldValue(field, match[2])
        if ('error' in coerced) return { ok: false, message: coerced.error }
        form.setValue(field.key, coerced.value)
        const shown = typeof coerced.value === 'boolean' ? (coerced.value ? 'yes' : 'no') : coerced.value
        return { ok: true, message: `${field.label} set to ${shown}.` }
      }
    }

    const read = text.match(/^(?:what(?:'s| is)|read)\s+(?:the\s+)?(.+)$/i)
    if (read) {
      const field = findField(form.fields(), read[1])
      if (field) {
        const value = form.getValue(field.key)
        return { ok: true, message: value === undefined || value === '' ? `${field.label} is empty.` : `${field.label} is ${String(value)}.` }
      }
    }
  }

  for (const command of [...state.commands].reverse()) {
    for (const pattern of command.patterns) {
      const match = text.match(pattern)
      if (match) {
        const params: Record<string, string> = { ...(match.groups ?? {}) }
        return { ok: true, message: command.run({ utterance: text, params }) ?? command.title }
      }
    }
  }

  return { ok: false, message: form ? `I can fill ${form.title}: try “set client name to Ana Cruz”.` : 'I did not understand. Try “new motor quote” or “open claims”.' }
}
