import { PRODUCTS } from './products'
import type { QuoteRecord } from './types'

const cell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Quotes and policies as CSV, in the column order of the legacy QuoteRecord export. */
export function quotesToCsv(quotes: readonly QuoteRecord[]): string {
  const header = ['Policy number', 'Product', 'Status', 'Client', 'Mobile', 'Email', 'Risk', 'Insurer', 'Inception from', 'Inception to', 'Basic premium', 'Taxes', 'Total amount due', 'Agent', 'Created']
  const rows = quotes.map((quote) => [
    quote.policyNumber, PRODUCTS[quote.product].legacyType, quote.status, quote.client.name, quote.client.mobile, quote.client.email,
    quote.risk, quote.insurer, quote.inceptionFrom, quote.inceptionTo, quote.premium.basicPremium.toFixed(2),
    quote.premium.totalTaxes.toFixed(2), quote.premium.totalAmountDue.toFixed(2), quote.agent, quote.createdDate.slice(0, 10)
  ])
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\n')
}

export function downloadText(filename: string, text: string, type = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
