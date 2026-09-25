/**
 * Builds the TAC lookup shards from data/tac_full.csv
 * (github.com/MoazEb/tac-database, MIT, © 2026 Moaz Ebrahem; ~255k TACs through 2025).
 *
 * CSV columns: Brand, TAC, SPECS. SPECS is free text such as
 * "XIAOMI REDMI NOTE 14S, Xiaomi 2502FRA65G, Global Model, 2025", parsed into
 * [brand, name, detail, year].
 *
 * The full index is ~8 MB, too big to bundle into a Worker, so it is split by the
 * TAC's first three digits into ~100 files under public/_data/tac/<prefix>.json.
 * They ship as static assets; the Worker and dev server load only the shard a
 * lookup needs (see worker/tac.ts).
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'data/tac_full.csv')
const target = resolve(root, 'public/_data/tac')
const SOURCE_NAME = 'TAC database by Moaz Ebrahem (github.com/MoazEb/tac-database), MIT'

/** Minimal RFC 4180 parser: quoted fields may contain commas and doubled quotes. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field !== '' || row.length > 0) rows.push([...row, field])
  return rows
}

// Words kept as written when title-casing the all-caps source.
const EXACT = new Map(
  ['iPhone', 'iPad', 'iPod', 'OnePlus', 'HMD', 'LG', 'ZTE', 'HTC', 'TCL', 'BLU', 'LTE', 'NFC', 'UK', 'EU', 'US', 'USA', 'HK', 'TW', 'SEA', 'SE', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XL', 'XR', 'XS', 'GT', 'RS'].map((word) => [word.toUpperCase(), word])
)

/** "REDMI NOTE 14S" → "Redmi Note 14S"; words with digits or listed acronyms stay as-is. */
function tidy(text) {
  if (text !== text.toUpperCase()) return text // already mixed case
  return text
    .split(/(\s+|-|\/|\(|\))/)
    .map((word) => EXACT.get(word) ?? (/\d/.test(word) || word.length <= 1 ? word : word[0] + word.slice(1).toLowerCase()))
    .join('')
}

const YEAR = /(?:^|(?<=[A-Za-z\s]))((?:19[89]|20[0-3])\d)$/

function parseSpecs(brand, specs) {
  let year = ''
  const parts = specs
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(YEAR)
      if (!match) return part
      year ||= match[1]
      return part.slice(0, part.length - match[1].length).trim()
    })
    .filter(Boolean)
  // "SAMSUNG, SAMSUNG SGH-T229": the first part is only the brand.
  if (parts.length > 1 && parts[0].toUpperCase() === brand.toUpperCase()) parts.shift()
  const name = parts.shift() ?? ''
  return { name: tidy(name), detail: parts.join(', '), year }
}

const rows = parseCsv(readFileSync(source, 'utf8'))
const header = rows.shift().map((cell) => cell.trim().toLowerCase())
const col = { brand: header.indexOf('brand'), tac: header.indexOf('tac'), specs: header.indexOf('specs') }
if (Object.values(col).some((index) => index < 0)) throw new Error(`Unexpected CSV header: ${header.join(',')}`)

const tacs = {}

/** Drops the brand from the name and detail parts that only repeat the name. */
function compact(brand, { name, detail, year }) {
  const withoutBrand = (text) => (text.toLowerCase().startsWith(`${brand.toLowerCase()} `) ? text.slice(brand.length + 1) : text)
  const model = withoutBrand(name)
  const extra = []
  for (const part of detail.split(',').map((item) => withoutBrand(item.trim())).filter(Boolean)) {
    const key = part.toLowerCase()
    if (key !== model.toLowerCase() && !extra.some((item) => item.toLowerCase() === key)) extra.push(part)
  }
  return [brand, model, extra.join(', '), year]
}
let skipped = 0
let duplicates = 0

for (const row of rows) {
  const rawTac = (row[col.tac] ?? '').trim()
  // Spreadsheet exports drop leading zeros ("1620200" was "01620200").
  const tac = /^\d{7,8}$/.test(rawTac) ? rawTac.padStart(8, '0') : ''
  const brand = tidy((row[col.brand] ?? '').trim())
  const specs = (row[col.specs] ?? '').trim()
  if (!tac || !brand || !specs) {
    skipped++
    continue
  }
  if (tac in tacs) {
    duplicates++ // keep the first listing
    continue
  }
  tacs[tac] = compact(brand, parseSpecs(brand, specs))
}

// One file per 3-digit TAC prefix: { source, tacs: { "35682053": [brand, name, detail, year] } }
const shards = new Map()
for (const [tac, device] of Object.entries(tacs)) {
  const prefix = tac.slice(0, 3)
  if (!shards.has(prefix)) shards.set(prefix, {})
  shards.get(prefix)[tac] = device
}
rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
for (const [prefix, entries] of shards) writeFileSync(resolve(target, `${prefix}.json`), JSON.stringify({ source: SOURCE_NAME, tacs: entries }))
// The shards are published with the site, so the MIT notice goes with them.
copyFileSync(resolve(root, 'data/LICENSE-tac-database.txt'), resolve(target, 'LICENSE.txt'))
console.log(`TAC index: ${Object.keys(tacs).length} TACs in ${shards.size} shards (${skipped} rows skipped, ${duplicates} duplicate TACs) → ${target.replace(root + '/', '')}/`)
