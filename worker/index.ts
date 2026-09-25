/**
 * Cloudflare Worker for SAIA.
 *
 * Static assets (the rsbuild `dist/`) are served by Workers Assets with SPA
 * fallback; this script only runs first for `/api/*` (see wrangler.jsonc).
 *
 * `/api/cmc/*` mirrors the dev-server proxy in rsbuild.config.ts: it forwards
 * to CoinMarketCap with the `CMC_API_KEY` secret so the key never reaches the
 * browser. Only the endpoints the app uses are allowed, and responses are
 * edge-cached so every visitor shares the same few credits.
 */

interface Env {
  ASSETS: Fetcher
  CMC_API_KEY?: string
}

const CMC_ORIGIN = 'https://pro-api.coinmarketcap.com'
const ALLOWED_CMC_PATHS = new Set(['/v1/cryptocurrency/listings/latest', '/v2/tools/price-conversion'])
/** CoinMarketCap refreshes about once a minute; five minutes keeps credit use low. */
const CACHE_SECONDS = 300

function json(status: number, message: string): Response {
  return Response.json({ status: { error_code: status, error_message: message } }, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function proxyCmc(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'GET') return json(405, 'Method not allowed.')
  if (!env.CMC_API_KEY) return json(503, 'Prices are not configured. Set the CMC_API_KEY secret.')

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/cmc/, '')
  if (!ALLOWED_CMC_PATHS.has(path)) return json(404, 'Unknown price endpoint.')

  const upstream = new URL(path + url.search, CMC_ORIGIN)
  // Cache on the upstream URL (no key in it), so the key never becomes part of a cache entry.
  const cacheKey = new Request(upstream.toString(), { method: 'GET' })
  const cache = caches.default
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const response = await fetch(upstream, { headers: { 'X-CMC_PRO_API_KEY': env.CMC_API_KEY, Accept: 'application/json' } })
  const body = await response.text()
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': response.ok ? `public, max-age=${CACHE_SECONDS}` : 'no-store' }
  const result = new Response(body, { status: response.status, headers })
  if (response.ok) ctx.waitUntil(cache.put(cacheKey, result.clone()))
  return result
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/api/cmc/')) return proxyCmc(request, env, ctx)
    if (pathname.startsWith('/api/')) return json(404, 'Not found.')
    return env.ASSETS.fetch(request)
  }
} satisfies ExportedHandler<Env>
