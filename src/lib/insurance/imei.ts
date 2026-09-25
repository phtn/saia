/**
 * IMEI reading and validation for mobile insurance.
 *
 * The legacy scanner (`lib/js/imeiScanner.js`) uploaded a photo and called a
 * `verifyImei` backend function. This module keeps that flow behind an
 * `ImeiOcrProvider`, and adds on-device reading: barcode detection on the
 * IMEI label of the phone box, and digit extraction from recognised text.
 */

export interface ImeiReading {
  imei: string
  /** Every valid IMEI found (dual-SIM phones carry two). */
  all: string[]
  source: 'barcode' | 'ocr' | 'manual'
  fileUrl?: string
}

export interface ImeiValidation {
  valid: boolean
  digits: string
  reason?: string
}

/** Luhn checksum over a digit string. */
export function luhnValid(digits: string): boolean {
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

/** Accepts `35-209900-176148-1`, spaces, or a 16-digit IMEISV (checked as its first 14 digits). */
export function validateImei(input: string): ImeiValidation {
  const digits = input.replace(/[\s-]/g, '')
  if (digits === '') return { valid: false, digits, reason: 'Enter the 15-digit IMEI.' }
  if (!/^\d+$/.test(digits)) return { valid: false, digits, reason: 'An IMEI contains digits only.' }
  if (digits.length === 16) return { valid: true, digits: digits.slice(0, 14) + luhnCheckDigit(digits.slice(0, 14)) }
  if (digits.length !== 15) return { valid: false, digits, reason: `An IMEI has 15 digits; this has ${digits.length}.` }
  if (!luhnValid(digits)) return { valid: false, digits, reason: 'The check digit does not match. Re-check the number.' }
  if (/^0+$/.test(digits)) return { valid: false, digits, reason: 'This IMEI is blank.' }
  return { valid: true, digits }
}

export function luhnCheckDigit(first14: string): string {
  for (let d = 0; d <= 9; d++) if (luhnValid(first14 + d)) return String(d)
  return '0'
}

/** Type Allocation Code: the first 8 digits, identifying make and model. */
export function typeAllocationCode(imei: string): string {
  return imei.replace(/\D/g, '').slice(0, 8)
}

export function formatImei(imei: string): string {
  const d = imei.replace(/\D/g, '')
  return d.length === 15 ? `${d.slice(0, 2)}-${d.slice(2, 8)}-${d.slice(8, 14)}-${d.slice(14)}` : d
}

/** Pulls valid IMEIs out of free text, e.g. OCR of the `*#06#` screen. */
export function extractImeis(text: string): string[] {
  const found = new Set<string>()
  const candidates = text.match(/\d[\d\s-]{13,20}\d/g) ?? []
  for (const candidate of candidates) {
    const digits = candidate.replace(/[\s-]/g, '')
    for (let start = 0; start + 15 <= digits.length; start++) {
      const slice = digits.slice(start, start + 15)
      if (luhnValid(slice) && !/^0+$/.test(slice)) {
        found.add(slice)
        break
      }
    }
  }
  return [...found]
}

// ---------------------------------------------------------------------------
// Barcode detection (Chromium on Android, Safari 17+ partially). Typed locally
// because `BarcodeDetector` is not yet in TypeScript's DOM library.

interface DetectedBarcode {
  rawValue: string
  format: string
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance
  getSupportedFormats(): Promise<string[]>
}

const IMEI_BARCODE_FORMATS = ['code_128', 'code_39', 'ean_13', 'qr_code', 'data_matrix']

function barcodeDetectorClass(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined') return null
  const candidate: unknown = Reflect.get(window, 'BarcodeDetector')
  return typeof candidate === 'function' ? (candidate as BarcodeDetectorConstructor) : null
}

export function barcodeScanningSupported(): boolean {
  return barcodeDetectorClass() !== null
}

let detector: BarcodeDetectorInstance | null = null

async function getDetector(): Promise<BarcodeDetectorInstance | null> {
  const Detector = barcodeDetectorClass()
  if (Detector === null) return null
  if (detector === null) {
    const supported = await Detector.getSupportedFormats().catch((): string[] => [])
    const formats = IMEI_BARCODE_FORMATS.filter((format) => supported.includes(format))
    detector = new Detector({ formats: formats.length > 0 ? formats : IMEI_BARCODE_FORMATS })
  }
  return detector
}

/** Reads IMEI barcodes from an image, video frame, or canvas. */
export async function detectImeiBarcodes(source: ImageBitmapSource): Promise<string[]> {
  const instance = await getDetector()
  if (instance === null) return []
  const codes = await instance.detect(source).catch((): DetectedBarcode[] => [])
  return extractImeis(codes.map((code) => code.rawValue).join('\n'))
}

// ---------------------------------------------------------------------------
// OCR provider: the backend hook the legacy `verifyImei` function filled.

export type ImeiOcrProvider = (file: File) => Promise<{ text?: string; imei?: string; fileUrl?: string }>

let ocrProvider: ImeiOcrProvider | null = null

/** Registers the server-side reader (e.g. a `verifyImei` endpoint). */
export function setImeiOcrProvider(provider: ImeiOcrProvider | null): void {
  ocrProvider = provider
}

export function hasImeiOcrProvider(): boolean {
  return ocrProvider !== null
}

/**
 * Reads the IMEI from a photo of the `*#06#` screen or the phone box: first on
 * the device via barcode detection, then through the OCR provider if one is set.
 */
export async function readImeiFromImage(file: File): Promise<ImeiReading | null> {
  if (barcodeScanningSupported() && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file).catch(() => null)
    if (bitmap !== null) {
      const found = await detectImeiBarcodes(bitmap)
      bitmap.close()
      if (found.length > 0) return { imei: found[0], all: found, source: 'barcode' }
    }
  }
  if (ocrProvider !== null) {
    const result = await ocrProvider(file)
    const found = result.imei ? extractImeis(result.imei) : extractImeis(result.text ?? '')
    if (found.length > 0) return { imei: found[0], all: found, source: 'ocr', fileUrl: result.fileUrl }
  }
  return null
}
