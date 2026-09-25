/**
 * Form state for a step pipeline, exposed to the voice assistant.
 *
 * Holds the values, and registers a `FormBridge` so the assistant can read and
 * fill fields by label, jump to the next open step, and submit.
 */
import { useMemo, useRef, useState } from 'octane'
import { useAssistantForm } from '@/lib/assistant/registry'
import type { FieldDef, FieldValue, FormValues } from '@/lib/insurance/types'

export interface FlowFormOptions {
  id: string
  title: string
  initial: FormValues
  fields: readonly FieldDef[]
  /** DOM id of the first step still open, for "next". */
  nextStepId: () => string | null
  onSubmit: () => string | void
}

export interface FlowForm {
  values: FormValues
  setValue: (key: string, value: FieldValue) => void
  setValues: (patch: FormValues) => void
  reset: (values: FormValues) => void
}

export function scrollToStep(id: string | null): void {
  if (id === null || typeof document === 'undefined') return
  const element = document.getElementById(id)
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  element?.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true })
}

export function useFlowForm({ id, title, initial, fields, nextStepId, onSubmit }: FlowFormOptions): FlowForm {
  const [values, setAll] = useState<FormValues>(initial)
  // The bridge is created once; it reads the latest render through this ref.
  const latest = useRef({ values, fields, nextStepId, onSubmit })
  latest.current = { values, fields, nextStepId, onSubmit }

  const setValue = (key: string, value: FieldValue) => setAll((current) => ({ ...current, [key]: value }))
  const setValues = (patch: FormValues) => setAll((current) => ({ ...current, ...patch }))

  const bridge = useMemo(
    () => ({
      id,
      title,
      fields: () => latest.current.fields,
      getValue: (key: string) => latest.current.values[key],
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

  return { values, setValue, setValues, reset: setAll }
}
