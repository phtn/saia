import type { IconName } from '@/lib/icons/types'

export type NavItem = {
  href: string
  icon: IconName
  label: string
  description: string
  title: string
  value: string | number
  tags: string[]
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      {
        href: '/',
        icon: 'dashboard',
        label: 'Overview',
        title: 'Overview',
        description: 'Your book at a glance',
        value: '',
        tags: ['home', 'dashboard', 'overview']
      },
      {
        href: '/quote',
        icon: 'quote',
        label: 'New quote',
        title: 'New quote',
        description: 'Quote any product',
        value: '',
        tags: ['quote', 'new']
      },
      {
        href: '/mobile',
        icon: 'smartphone',
        label: 'Mobile',
        title: 'Mobile insurance',
        description: 'Scan IMEI and quote a phone',
        value: '',
        tags: ['cellphone', 'imei', 'device']
      },
      {
        href: '/policies',
        icon: 'policy',
        label: 'Policies',
        title: 'Policies',
        description: 'Quotes and policies in your book',
        value: '',
        tags: ['policies', 'quotes']
      },
      {
        href: '/claims',
        icon: 'claim',
        label: 'Claims',
        title: 'Claims',
        description: 'File and track claims',
        value: '',
        tags: ['claims']
      },
      {
        href: '/contacts',
        icon: 'contacts',
        label: 'Contacts',
        title: 'Contacts',
        description: 'People and how to reach them',
        value: '',
        tags: ['contacts', 'people', 'address book']
      },
      {
        href: '/crypto',
        icon: 'crypto',
        label: 'Crypto',
        title: 'Crypto wallets',
        description: 'Your and your contacts’ wallet addresses',
        value: '',
        tags: ['crypto', 'wallet', 'bitcoin', 'ethereum', 'address']
      }
    ]
  },
  {
    title: 'Manager',
    items: [
      {
        href: '/analytics',
        icon: 'charts',
        label: 'Analytics',
        title: 'Analytics',
        description: 'Production and motor book',
        value: '',
        tags: ['analytics', 'reports']
      },
      {
        href: '/tasks',
        icon: 'tasks',
        label: 'Tasks',
        title: 'Tasks',
        description: 'Follow-ups and reminders',
        value: '',
        tags: ['tasks', 'reminders']
      },
      {
        href: '/notes',
        icon: 'notes',
        label: 'Notes',
        title: 'Notes',
        description: 'Jot, dictate and record',
        value: '',
        tags: ['notes', 'voice', 'recording', 'memo']
      }
    ]
  }
]
