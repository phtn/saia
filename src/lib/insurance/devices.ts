/**
 * Phone variants with an approved fair market value. The legacy app read these
 * from a PhoneVariant entity; this list stands in until that is connected.
 */
import type { PhoneVariant } from './cellphoneQuote'

export interface DeviceOption extends PhoneVariant {
  id: string
  /** Type Allocation Codes seen for this model; lets an IMEI suggest the device. */
  tacs: readonly string[]
}

export const DEVICE_CATALOG: readonly DeviceOption[] = [
  { id: 'iphone-16-pro-256', brand: 'Apple', model: 'iPhone 16 Pro', storage: '256GB', average_fmv: 72990, verification_status: 'Verified', tacs: ['35693803'] },
  { id: 'iphone-16-128', brand: 'Apple', model: 'iPhone 16', storage: '128GB', average_fmv: 52990, verification_status: 'Verified', tacs: [] },
  { id: 'iphone-15-128', brand: 'Apple', model: 'iPhone 15', storage: '128GB', average_fmv: 44990, verification_status: 'Verified', tacs: [] },
  { id: 'galaxy-s24-ultra-512', brand: 'Samsung', model: 'Galaxy S24 Ultra', storage: '512GB', average_fmv: 69990, verification_status: 'Verified', tacs: ['49015420'] },
  { id: 'galaxy-a55-256', brand: 'Samsung', model: 'Galaxy A55 5G', storage: '256GB', average_fmv: 24990, verification_status: 'Verified', tacs: [] },
  { id: 'galaxy-z-flip6-256', brand: 'Samsung', model: 'Galaxy Z Flip6', storage: '256GB', average_fmv: 64990, verification_status: 'Verified', tacs: [] },
  { id: 'xiaomi-14t-pro-512', brand: 'Xiaomi', model: '14T Pro', storage: '512GB', average_fmv: 39999, verification_status: 'Verified', tacs: [] },
  { id: 'redmi-note-13-pro-256', brand: 'Xiaomi', model: 'Redmi Note 13 Pro', storage: '256GB', average_fmv: 15999, verification_status: 'Verified', tacs: [] },
  { id: 'oppo-reno12-256', brand: 'OPPO', model: 'Reno12 5G', storage: '256GB', average_fmv: 25999, verification_status: 'Verified', tacs: [] },
  { id: 'vivo-v40-256', brand: 'vivo', model: 'V40 5G', storage: '256GB', average_fmv: 25999, verification_status: 'Verified', tacs: [] },
  { id: 'pixel-9-pro-256', brand: 'Google', model: 'Pixel 9 Pro', storage: '256GB', average_fmv: 62990, verification_status: 'Verified', tacs: [] },
  { id: 'tecno-camon-30-256', brand: 'TECNO', model: 'Camon 30', storage: '256GB', average_fmv: 12999, verification_status: 'Verified', tacs: [] }
]

export const deviceLabel = (device: PhoneVariant): string => `${device.brand} ${device.model} ${device.storage}`.trim()

export function deviceForTac(imei: string): DeviceOption | null {
  const tac = imei.replace(/\D/g, '').slice(0, 8)
  return DEVICE_CATALOG.find((device) => device.tacs.includes(tac)) ?? null
}
