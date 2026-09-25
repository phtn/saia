/**
 * Live prices from CoinMarketCap through the dev server's `/api/cmc` proxy
 * (see rsbuild.config.ts), which holds the API key.
 *
 * The free plan allows one quote currency per call, so prices come in USD and a
 * separate USD→PHP conversion gives the peso values. One refresh costs 2 credits;
 * results are cached in localStorage and refreshed every 10 minutes while visible.
 */
import { useEffect, useSyncExternalStore } from 'octane'

export interface Coin {
  id: number
  rank: number
  name: string
  symbol: string
  priceUsd: number
  change24h: number
  change7d: number
  marketCapUsd: number
  volume24hUsd: number
}

export interface MarketState {
  coins: Coin[]
  /** Pesos per US dollar. */
  usdPhp: number
  updatedAt: string
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string
}

const CACHE_KEY = 'saia-market-v1'
const REFRESH_MS = 10 * 60_000
const LISTING_LIMIT = 100

interface CmcListing {
  id: number
  cmc_rank: number
  name: string
  symbol: string
  quote: { USD: { price: number; percent_change_24h: number; percent_change_7d: number; market_cap: number; volume_24h: number } }
}

interface CmcStatus {
  error_code: number
  error_message: string | null
}

function readCache(): MarketState {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as Pick<MarketState, 'coins' | 'usdPhp' | 'updatedAt'>
      if (Array.isArray(cached.coins) && cached.coins.length > 0) return { ...cached, status: 'ready', error: '' }
    }
  } catch {
    // Fall through to an empty market.
  }
  return { coins: [], usdPhp: 0, updatedAt: '', status: 'idle', error: '' }
}

let state: MarketState = typeof window === 'undefined' ? { coins: [], usdPhp: 0, updatedAt: '', status: 'idle', error: '' } : readCache()
const listeners = new Set<() => void>()

function set(patch: Partial<MarketState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

async function cmc<T>(path: string): Promise<T> {
  const response = await fetch(`/api/cmc${path}`)
  const body = (await response.json().catch(() => null)) as { status?: CmcStatus; data?: T } | null
  if (!response.ok || !body || body.status?.error_code) {
    const message = body?.status?.error_message ?? (response.status === 404 ? 'Price proxy not running. Set CMC_API_KEY in .env and restart the dev server.' : `CoinMarketCap error ${response.status}`)
    throw new Error(message)
  }
  return body.data as T
}

let inflight: Promise<void> | null = null

export function refreshMarket(): Promise<void> {
  inflight ??= (async () => {
    set({ status: 'loading', error: '' })
    try {
      const [listings, fx] = await Promise.all([
        cmc<CmcListing[]>(`/v1/cryptocurrency/listings/latest?limit=${LISTING_LIMIT}&convert=USD`),
        // 2781 is CoinMarketCap's id for the US dollar.
        cmc<{ quote: { PHP: { price: number } } }>('/v2/tools/price-conversion?amount=1&id=2781&convert=PHP')
      ])
      const coins: Coin[] = listings.map((item) => ({
        id: item.id,
        rank: item.cmc_rank,
        name: item.name,
        symbol: item.symbol,
        priceUsd: item.quote.USD.price,
        change24h: item.quote.USD.percent_change_24h,
        change7d: item.quote.USD.percent_change_7d,
        marketCapUsd: item.quote.USD.market_cap,
        volume24hUsd: item.quote.USD.volume_24h
      }))
      const next = { coins, usdPhp: fx.quote.PHP.price, updatedAt: new Date().toISOString() }
      set({ ...next, status: 'ready' })
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(next))
      } catch {
        // Cache is optional.
      }
    } catch (error) {
      // Keep showing the last good prices; just flag the failure.
      set({ status: state.coins.length > 0 ? 'ready' : 'error', error: error instanceof Error ? error.message : 'Could not load prices.' })
    } finally {
      inflight = null
    }
  })()
  return inflight
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => state

/** Market prices; fetches when stale and keeps refreshing while the page is visible. */
export function useMarket(): MarketState {
  useEffect(() => {
    const stale = () => !state.updatedAt || Date.now() - new Date(state.updatedAt).getTime() > REFRESH_MS
    if (stale()) void refreshMarket()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && stale()) void refreshMarket()
    }, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && stale()) void refreshMarket()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export const coinLogo = (id: number) => `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`

/** `$83,722.40`, `$0.1234`, `$0.00001234` — more decimals for small prices. */
export function usd(value: number): string {
  const abs = Math.abs(value)
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: abs >= 1 ? 2 : Math.min(digits, 4), maximumFractionDigits: digits })
}

/** `$1.65T`, `$52.10B`, `$950.00M` */
export function usdCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return usd(value)
}

/** Peso price with the same small-number precision as `usd`. */
export function phpPrice(value: number): string {
  const abs = Math.abs(value)
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8
  return '₱' + value.toLocaleString('en-PH', { minimumFractionDigits: abs >= 1 ? 2 : Math.min(digits, 4), maximumFractionDigits: digits })
}

export const signedPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
