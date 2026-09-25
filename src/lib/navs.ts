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
      { href: '/', icon: 'dashboard', label: 'Overview', title: 'Overview', description: 'Your book at a glance', value: '', tags: ['home', 'dashboard', 'overview'] },
      { href: '/quote', icon: 'quote', label: 'New quote', title: 'New quote', description: 'Quote any product', value: '', tags: ['quote', 'new'] },
      { href: '/mobile', icon: 'smartphone', label: 'Mobile', title: 'Mobile insurance', description: 'Scan IMEI and quote a phone', value: '', tags: ['cellphone', 'imei', 'device'] },
      { href: '/policies', icon: 'policy', label: 'Policies', title: 'Policies', description: 'Quotes and policies in your book', value: '', tags: ['policies', 'quotes'] },
      { href: '/claims', icon: 'claim', label: 'Claims', title: 'Claims', description: 'File and track claims', value: '', tags: ['claims'] }
    ]
  },
  {
    title: 'Manager',
    items: [
      { href: '/analytics', icon: 'analytics', label: 'Analytics', title: 'Analytics', description: 'Production and motor book', value: '', tags: ['analytics', 'reports'] },
      { href: '/tasks', icon: 'calendar', label: 'Tasks', title: 'Tasks', description: 'Follow-ups and reminders', value: '', tags: ['tasks', 'reminders'] }
    ]
  }
]
