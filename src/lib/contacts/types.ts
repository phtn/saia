export type ChainId = 'bitcoin' | 'ethereum' | 'solana' | 'polygon' | 'bnb' | 'base' | 'arbitrum' | 'tron' | 'litecoin' | 'dogecoin' | 'xrp'

export interface Contact {
  id: string
  name: string
  company: string
  mobile: string
  email: string
  channel: string
  birthday: string
  address: string
  notes: string
  favorite: boolean
  createdDate: string
  updatedDate: string
}

/** Who a wallet belongs to: you, or one of your contacts. */
export type WalletOwner = 'me' | string

/** A public receiving address. Private keys and recovery phrases are never stored. */
export interface Wallet {
  id: string
  label: string
  chain: ChainId
  address: string
  owner: WalletOwner
  note: string
  createdDate: string
}
