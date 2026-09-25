# saia

Insurance agent and manager dashboard built with [Beast](https://beast-docs-adv.beastjs.workers.dev) (`.btsx`) on Octane.

```bash
bun install
bun run dev        # local dev server
bun run check      # type-check every .btsx/.ts file and the Worker, then build
```

Copy `.env.example` to `.env` and set `CMC_API_KEY` for live crypto prices.

## Deploy (Cloudflare Workers)

The app ships as one Worker (`wrangler.jsonc`, `worker/index.ts`): the built `dist/` is served as static assets
with single-page-app fallback, and the Worker only runs for `/api/*`, where `/api/cmc/*` proxies CoinMarketCap
with the `CMC_API_KEY` secret (allow-listed endpoints, edge-cached for 5 minutes).

```bash
bunx wrangler login                     # once
bunx wrangler secret put CMC_API_KEY    # once, and whenever the key rotates
bun run cf:deploy                       # typecheck, build, wrangler deploy
```

- `bun run cf:dev` builds and runs the production Worker locally on :8787 (secrets from `.dev.vars`, gitignored).
- `bun run cf:types` regenerates `worker/worker-configuration.d.ts` after changing `wrangler.jsonc`.
- All app data (book, notes, contacts, wallets, portfolio) lives in each browser's storage; nothing is stored server-side yet.

## Screens

| Route | What it does |
| --- | --- |
| `/` | Overview: written premium, conversion ring, pipeline / renewals / claims, quick quote, today's tasks |
| `/quote`, `/quote/$product` | Quote workflow for motor, CTPL, travel, personal accident, commercial, pet, term life, home |
| `/mobile` | Cellphone quote: device catalog, IMEI scan (camera barcode, photo, or typed with Luhn check), coverage packages |
| `/policies` | Book of quotes/policies, status workflow (Quote → Pending → Verified → Active), client messaging links, CSV export |
| `/claims`, `/claims/new` | Claims desk and first-notice-of-loss pipeline |
| `/analytics` | Agency production plus the imported motor schedules (`lib/entities/MotorPolicySchedule.json`) |
| `/tasks` | Reminders with WhatsApp / Viber / Messenger / SMS / email deep links |

Forms use the vertical step pipeline from livesnaps (`components/forms/FlowStep.btsx`, `lib/forms/step-flow.ts`).

## Layout of `src/lib`

- `insurance/`: typed ports of the legacy `lib/js` modules, plus the product catalog and rating (`products.ts`),
  the cellphone coverage engine (`cellphoneQuote.ts`), IMEI reading (`imei.ts`), analytics, and a localStorage-backed
  store (`store.ts`). The store's mutation functions are where a backend plugs in.
- `assistant/`: groundwork for the voice assistant. Screens register **commands** and **form bridges**;
  `interpret()` maps an utterance to an action ("new motor quote", "set declared value to 850 thousand", "next",
  "submit"). `speech.ts` wraps the Web Speech API. Open the assistant with ⌘K / Ctrl+K.
- `js/`: the original minified modules, kept for reference.

Rates in `products.ts` are indicative placeholders. Replace them with each insurer's approved tariff before issuing
policies. On-device IMEI reading needs `BarcodeDetector` (Chromium/Android). Register a server OCR reader with
`setImeiOcrProvider()` for other browsers.

## Beast notes

- A `scope` block inside an `each` loop renders nothing in Octane 0.2.13; use a local `component` instead.
- Non-ASCII literal text inside `if`/`switch` branches fails to parse; write it as `#{'₱'}`.
- JSX is not accepted inside attributes; build slot content with `createElement` in `setup`.
