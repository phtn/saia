import { beastDevtools } from '@beastjs/devtools/rsbuild'
import { defineConfig } from '@rsbuild/core'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { beastOctane } from 'beast-tsrx/rsbuild'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { imeiResponse, shardPath, type TacShard } from './worker/tac'

const root = path.dirname(fileURLToPath(import.meta.url))

// CoinMarketCap rejects browser requests and its key must stay secret, so the dev/preview
// server proxies /api/cmc and adds the key here. Only PUBLIC_* env vars reach the bundle.
const cmcKey = process.env.CMC_API_KEY

// Same IMEI check the Worker serves, so `/api/imei/:imei` works in dev and preview too;
// shards are read from public/ (built by `bun run tac:index`).
const loadShard = async (prefix: string): Promise<TacShard | null> => {
  try {
    return JSON.parse(readFileSync(path.join(root, 'public', shardPath(prefix)), 'utf8')) as TacShard
  } catch {
    return null
  }
}

export default defineConfig({
  context: root,
  source: { entry: { index: './src/main.ts' } },
  resolve: {
    extensions: ['.btsx', '.ts', '.tsx', '.tsrx', '.js', '.json'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  html: { template: './index.html' },
  server: {
    setup: ({ server }) => {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (!pathname.startsWith('/api/imei/')) return next()
        void imeiResponse(pathname, loadShard).then(({ status, body }) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        })
      })
    },
    proxy: cmcKey
      ? {
          '/api/cmc': {
            target: 'https://pro-api.coinmarketcap.com',
            changeOrigin: true,
            pathRewrite: { '^/api/cmc': '' },
            headers: { 'X-CMC_PRO_API_KEY': cmcKey, Accept: 'application/json' }
          }
        }
      : undefined
  },
  plugins: [
    pluginTailwindcss(),
    // `profile` compiles Octane's inspection hook in for the DevTools Components panel; dev only.
    ...beastOctane({ octane: { profile: process.env.NODE_ENV !== 'production' } }),
    // In-page Beast DevTools overlay (Alt+Shift+D); only runs on the dev server.
    beastDevtools()
  ]
})
