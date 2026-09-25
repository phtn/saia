/** Client messaging deep links, ported from `lib/js/messageChannels.js`. */
import type { MessageChannel } from './types'

export const MESSAGE_CHANNELS: readonly MessageChannel[] = ['WhatsApp', 'Viber', 'Messenger', 'SMS', 'Email']

export interface ContactHandles {
  phone?: string
  whatsapp?: string
  viber?: string
  messenger?: string
  email?: string
}

export interface ReminderMessage {
  title: string
  dueDatetime?: string
  location?: string
  notes?: string
}

const whenLabel = (value: string): string => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function reminderText(reminder: ReminderMessage): string {
  let text = `Reminder: ${reminder.title}`
  if (reminder.dueDatetime) text += `\nWhen: ${whenLabel(reminder.dueDatetime)}`
  if (reminder.location) text += `\nWhere: ${reminder.location}`
  if (reminder.notes) text += `\nNotes: ${reminder.notes}`
  return text
}

/** A link that opens the channel's app with the message pre-filled, or null when the contact lacks a handle. */
export function channelLink(channel: MessageChannel, contact: ContactHandles, message: string): string | null {
  const body = encodeURIComponent(message)
  const digits = (value: string | undefined) => (value ?? '').replace(/[^\d]/g, '')
  switch (channel) {
    case 'WhatsApp': {
      const n = digits(contact.whatsapp || contact.phone)
      return n ? `https://wa.me/${n}?text=${body}` : null
    }
    case 'Viber': {
      const n = digits(contact.viber || contact.phone)
      return n ? `viber://chat?number=%2B${n}` : null
    }
    case 'Messenger': {
      const handle = (contact.messenger ?? '').replace(/^@/, '').trim()
      return handle ? `https://m.me/${handle}` : null
    }
    case 'SMS': {
      const n = (contact.phone ?? '').replace(/[^\d+]/g, '')
      return n ? `sms:${n}?&body=${body}` : null
    }
    case 'Email': {
      const email = (contact.email ?? '').trim()
      if (!email) return null
      const subject = encodeURIComponent(message.split('\n')[0].replace(/^Reminder:\s*/, '') || 'Message')
      return `mailto:${email}?subject=${subject}&body=${body}`
    }
  }
}
