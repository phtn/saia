/**
 * Every form in the app runs on TanStack Form (`@octanejs/tanstack-form`).
 *
 * `useFlowForm` owns the `useForm` instance, keeps the simple `values` /
 * `setValue` surface the step pipelines use, and registers a `FormBridge` so
 * the voice assistant can read and fill fields by label, jump to the next open
 * step, and submit. Fields bind to the form through `FormField` (useField),
 * which runs each `FieldDef`'s required/`validate` rules as TanStack validators.
 */
import { useMemo, useRef } from 'octane'
import { useForm, useStore } from '@octanejs/tanstack-form'
import { useAssistantForm } from '@/lib/assistant/registry'
import type { FieldDef, FieldValue, FormValues } from '@/lib/insurance/types'

export interface FlowFormOptions {
  id: string
  title: string
  initial: FormValues
  fields: readonly FieldDef[]
  /** DOM id of the first step still open, for "next". */
  nextStepId: () => string | null
  /** Runs after TanStack validation passes (UI) or directly (assistant); returns a spoken status. */
  onSubmit: () => string | void
}

function useFormApi(initial: FormValues, onValid: () => void) {
  return useForm({ defaultValues: initial, onSubmit: onValid })
}

export type FlowFormApi = ReturnType<typeof useFormApi>

export interface FlowForm {
  /** The TanStack form instance; `FormField` binds fields to it. */
  api: FlowFormApi
  values: FormValues
  setValue: (key: string, value: FieldValue) => void
  setValues: (patch: FormValues) => void
  reset: (values: FormValues) => void
  /** Validate every mounted field, then run `onSubmit` if they all pass. */
  submit: () => Promise<void>
}

export function scrollToStep(id: string | null): void {
  if (id === null || typeof document === 'undefined') return
  const element = document.getElementById(id)
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  element?.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true })
}

export function useFlowForm({ id, title, initial, fields, nextStepId, onSubmit }: FlowFormOptions): FlowForm {
  // The form and the bridge are created once; they read the latest render through this ref.
  const latest = useRef({ fields, nextStepId, onSubmit })
  latest.current = { fields, nextStepId, onSubmit }

  // useForm re-applies `defaultValues` whenever they change between renders, which would
  // wipe a reset or undo typing on an untouched form; pin the first render's defaults.
  const defaults = useRef(initial)
  const api = useFormApi(defaults.current, () => void latest.current.onSubmit())
  const values = useStore(api.store, (state) => state.values)

  const setValue = (key: string, value: FieldValue) => api.setFieldValue(key, value)
  const setValues = (patch: FormValues) => {
    for (const [key, value] of Object.entries(patch)) api.setFieldValue(key, value)
  }

  const bridge = useMemo(
    () => ({
      id,
      title,
      fields: () => latest.current.fields,
      getValue: (key: string) => api.getFieldValue(key),
      setValue,
      next: () => {
        const step = latest.current.nextStepId()
        scrollToStep(step)
        return step === null ? 'Every step is complete. Say “submit” to save.' : 'Moved to the next open step.'
      },
      submit: () => latest.current.onSubmit()
    }),
    [id, title]
  )
  useAssistantForm(bridge)

  return { api, values, setValue, setValues, reset: (next) => api.reset(next, { keepDefaultValues: true }), submit: () => api.handleSubmit() }
}

/** The TanStack validator for one field: required first, then the field's own rule. */
export function fieldValidator(field: FieldDef) {
  return ({ value, fieldApi }: { value: FieldValue | undefined; fieldApi: { form: { state: { values: FormValues } } } }): string | undefined => {
    const empty = value === undefined || (typeof value === 'string' && value.trim() === '')
    if (field.required && field.type !== 'boolean' && empty) return `${field.label} is required.`
    if (empty || !field.validate) return undefined
    return field.validate(value, fieldApi.form.state.values)
  }
}
