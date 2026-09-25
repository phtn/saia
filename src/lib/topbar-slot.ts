/** The topbar element that page headers portal into, registered by the Topbar via a ref callback. */
import { useSyncExternalStore } from 'octane'

let slot: HTMLElement | null = null
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => slot

export function setTopbarSlot(element: HTMLElement | null): void {
  if (slot === element) return
  slot = element
  for (const listener of listeners) listener()
}

export function useTopbarSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribe, snapshot, () => null)
}
