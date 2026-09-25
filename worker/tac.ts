/**
 * IMEI check against the TAC database. Shared by the Cloudflare Worker
 * (`/api/imei/:imei`) and the rsbuild dev/preview middleware, so both answer the same way.
 *
 * The data is split by TAC prefix into static shards (`/_data/tac/<first 3 digits>.json`,
 * built by scripts/build-tac-index.mjs); each caller supplies how to load one.
 */

/** `[brand, model, detail, year]` */
export type TacRecord = [string, string, string, string]

export interface TacShard {
  source: string
  tacs: Record<string, TacRecord>
}

export type ShardLoader = (prefix: string) => Promise<TacShard | null>

export interface ImeiCheck {
  /** Digits only, as checked. */
  imei: string
  tac: string
  /** 15 digits (or a 16-digit IMEISV) with a matching Luhn check digit. */
  valid: boolean
  reason?: string
  /** The model this TAC was allocated to, when the database knows it. */
  device: { brand: string; model: string; detail: string; year: string } | null
  source: string | null
}

export const shardPath = (prefix: string) => `/_data/tac/${prefix}.json`

function luhnValid(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

function validity(digits: string): { valid: boolean; reason?: string } {
  if (digits.length === 8) return { valid: false, reason: 'TAC only; send all 15 digits to validate.' }
  if (digits.length === 16) return { valid: true } // IMEISV: software version replaces the check digit
  if (digits.length !== 15) return { valid: false, reason: `An IMEI has 15 digits; this has ${digits.length}.` }
  if (/^0+$/.test(digits)) return { valid: false, reason: 'This IMEI is blank.' }
  if (!luhnValid(digits)) return { valid: false, reason: 'The check digit does not match.' }
  return { valid: true }
}

/** Checks an IMEI (or just its 8-digit TAC) and looks up the device model. */
export async function checkImei(input: string, loadShard: ShardLoader): Promise<ImeiCheck | { error: string }> {
  const digits = input.replace(/[\s-]/g, '')
  if (!/^\d{8,16}$/.test(digits)) return { error: 'Send an IMEI (15 digits) or a TAC (8 digits).' }
  const tac = digits.slice(0, 8)
  const shard = await loadShard(tac.slice(0, 3))
  const record = shard?.tacs[tac]
  return {
    imei: digits,
    tac,
    ...validity(digits),
    device: record ? { brand: record[0], model: record[1], detail: record[2], year: record[3] } : null,
    source: shard?.source ?? null
  }
}

/** HTTP handling shared by the Worker and dev middleware: `/api/imei/<digits>`. */
export async function imeiResponse(pathname: string, loadShard: ShardLoader): Promise<{ status: number; body: unknown }> {
  const input = decodeURIComponent(pathname.replace(/^\/api\/imei\/?/, ''))
  const result = await checkImei(input, loadShard)
  return 'error' in result ? { status: 400, body: result } : { status: 200, body: result }
}
