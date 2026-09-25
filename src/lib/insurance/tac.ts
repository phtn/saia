/**
 * Device lookup by TAC (the IMEI's first 8 digits) through `/api/imei/:tac`,
 * served by the Cloudflare Worker and the dev server from the TAC database
 * (github.com/MoazEb/tac-database). Only the TAC is sent, never the full IMEI; answers are cached per TAC.
 */
import { useEffect, useState } from 'octane'

export interface TacDevice {
  brand: string
  model: string
  /** Model codes / variants, e.g. "SM-S937U". */
  detail: string
  year: string
}

export type TacLookup =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'found'; tac: string; device: TacDevice; source: string }
  | { status: 'unknown'; tac: string }

const cache = new Map<string, Promise<TacLookup>>()

function fetchTac(tac: string): Promise<TacLookup> {
  let pending = cache.get(tac)
  if (!pending) {
    pending = fetch(`/api/imei/${tac}`)
      .then(async (response): Promise<TacLookup> => {
        if (!response.ok) throw new Error(`TAC lookup failed (${response.status})`)
        const body = (await response.json()) as { device: TacDevice | null; source: string | null }
        return body.device ? { status: 'found', tac, device: body.device, source: body.source ?? '' } : { status: 'unknown', tac }
      })
      .catch((): TacLookup => {
        cache.delete(tac) // let a later attempt retry
        return { status: 'error' }
      })
    cache.set(tac, pending)
  }
  return pending
}

/** Looks up the device for an IMEI as soon as its 8-digit TAC is typed. */
export function useTacLookup(imei: string): TacLookup {
  const tac = imei.replace(/\D/g, '').slice(0, 8)
  const [result, setResult] = useState<TacLookup>({ status: 'idle' })
  useEffect(() => {
    if (tac.length < 8) {
      setResult({ status: 'idle' })
      return
    }
    let current = true
    setResult({ status: 'loading' })
    void fetchTac(tac).then((next) => {
      if (current) setResult(next)
    })
    return () => {
      current = false
    }
  }, [tac])
  return result
}

export const tacDeviceName = (device: TacDevice) => (device.model.toLowerCase().startsWith(device.brand.toLowerCase()) ? device.model : `${device.brand} ${device.model}`)
