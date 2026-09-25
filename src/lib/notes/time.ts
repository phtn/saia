import { useSyncExternalStore } from 'octane'

/** `just now`, `5m ago`, `3h ago`, `yesterday`, `4d ago`, then `Sep 12` / `Sep 12, 2025`. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso)
  const seconds = Math.max(0, Math.round((now - then.getTime()) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  const sameYear = then.getFullYear() === new Date(now).getFullYear()
  return then.toLocaleDateString('en-PH', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
}

// One shared minute ticker so every "time ago" label on the board refreshes together.
let minute = Date.now()
const listeners = new Set<() => void>()
let timer = 0

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  if (listeners.size === 1) {
    timer = window.setInterval(() => {
      minute = Date.now()
      for (const notify of listeners) notify()
    }, 60_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.clearInterval(timer)
  }
}

/** The current time, updated once a minute. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => minute, () => minute)
}
