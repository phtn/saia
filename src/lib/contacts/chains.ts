/**
 * Supported chains and public-address checks. The checks are format-level
 * (prefix, alphabet, length), enough to catch typos and wrong-chain pastes;
 * they are not checksum verification.
 */
import type { ChainId } from './types'

export interface ChainInfo {
  label: string
  symbol: string
  color: string
  pattern: RegExp
  /** What a valid address looks like, for error messages. */
  format: string
  explorer: (address: string) => string
}

const BASE58 = '[1-9A-HJ-NP-Za-km-z]'
const EVM = /^0x[a-fA-F0-9]{40}$/
const EVM_FORMAT = '0x followed by 40 hex characters'

export const CHAINS: Record<ChainId, ChainInfo> = {
  bitcoin: { label: 'Bitcoin', symbol: 'BTC', color: '#f7931a', pattern: new RegExp(`^(bc1[02-9ac-hj-np-z]{11,71}|[13]${BASE58}{25,34})$`), format: 'bc1…, 1… or 3…', explorer: (a) => `https://mempool.space/address/${a}` },
  ethereum: { label: 'Ethereum', symbol: 'ETH', color: '#627eea', pattern: EVM, format: EVM_FORMAT, explorer: (a) => `https://etherscan.io/address/${a}` },
  solana: { label: 'Solana', symbol: 'SOL', color: '#14f195', pattern: new RegExp(`^${BASE58}{32,44}$`), format: '32–44 base58 characters', explorer: (a) => `https://solscan.io/account/${a}` },
  polygon: { label: 'Polygon', symbol: 'POL', color: '#8247e5', pattern: EVM, format: EVM_FORMAT, explorer: (a) => `https://polygonscan.com/address/${a}` },
  bnb: { label: 'BNB Chain', symbol: 'BNB', color: '#f3ba2f', pattern: EVM, format: EVM_FORMAT, explorer: (a) => `https://bscscan.com/address/${a}` },
  base: { label: 'Base', symbol: 'BASE', color: '#0052ff', pattern: EVM, format: EVM_FORMAT, explorer: (a) => `https://basescan.org/address/${a}` },
  arbitrum: { label: 'Arbitrum', symbol: 'ARB', color: '#28a0f0', pattern: EVM, format: EVM_FORMAT, explorer: (a) => `https://arbiscan.io/address/${a}` },
  tron: { label: 'Tron', symbol: 'TRX', color: '#ff060a', pattern: new RegExp(`^T${BASE58}{33}$`), format: 'T followed by 33 base58 characters', explorer: (a) => `https://tronscan.org/#/address/${a}` },
  litecoin: { label: 'Litecoin', symbol: 'LTC', color: '#345d9d', pattern: new RegExp(`^(ltc1[02-9ac-hj-np-z]{11,71}|[LM3]${BASE58}{26,33})$`), format: 'ltc1…, L…, M… or 3…', explorer: (a) => `https://litecoinspace.org/address/${a}` },
  dogecoin: { label: 'Dogecoin', symbol: 'DOGE', color: '#c2a633', pattern: new RegExp(`^D[5-9A-HJ-NP-U]${BASE58}{32}$`), format: 'D followed by 33 base58 characters', explorer: (a) => `https://dogechain.info/address/${a}` },
  xrp: { label: 'XRP Ledger', symbol: 'XRP', color: '#8a8f98', pattern: new RegExp(`^r${BASE58}{24,34}$`), format: 'r followed by 24–34 base58 characters', explorer: (a) => `https://xrpscan.com/account/${a}` }
}

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[]

export const chainByLabel = (label: string): ChainId | undefined => CHAIN_IDS.find((id) => CHAINS[id].label === label)

/** True when the text looks like a private key or recovery phrase rather than an address. */
export function looksSecret(text: string): boolean {
  const value = text.trim()
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(value)) return true // raw hex private key
  if (new RegExp(`^[5KL]${BASE58}{50,51}$`).test(value)) return true // Bitcoin WIF
  if (new RegExp(`^${BASE58}{86,90}$`).test(value)) return true // Solana secret key
  if (/^xprv|^tprv|^zprv|^yprv/.test(value)) return true // extended private key
  const words = value.toLowerCase().split(/\s+/)
  return [12, 15, 18, 21, 24].includes(words.length) && words.every((word) => /^[a-z]{3,8}$/.test(word)) // BIP-39 phrase
}

export const SECRET_WARNING = 'That looks like a private key or recovery phrase. Never store or share those. Only public addresses belong here.'

/** An error message for this address on this chain, or undefined when it looks right. */
export function addressError(chain: ChainId | undefined, address: string): string | undefined {
  const value = address.trim()
  if (looksSecret(value)) return SECRET_WARNING
  if (/\s/.test(value)) return 'Addresses have no spaces.'
  if (!chain) return undefined
  const info = CHAINS[chain]
  return info.pattern.test(value) ? undefined : `Not ${/^[AEIOU]/.test(info.label) ? 'an' : 'a'} ${info.label} address. Expected ${info.format}.`
}

/** `0x1234…abcd` */
export const shortAddress = (address: string) => (address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address)
