import { defineConfig } from '@rsbuild/core'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { beastOctane } from 'beast-tsrx/rsbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

// CoinMarketCap rejects browser requests and its key must stay secret, so the dev/preview
// server proxies /api/cmc and adds the key here. Only PUBLIC_* env vars reach the bundle.
const cmcKey = process.env.CMC_API_KEY

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
  plugins: [pluginTailwindcss(), ...beastOctane()]
})
