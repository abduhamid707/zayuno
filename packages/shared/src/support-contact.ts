import { StructuredSupportContact } from '@zayuno/contracts';

/**
 * Normalizes any legacy string or structured support contact into a standard
 * StructuredSupportContact format. Strips internal notes and unapproved fields.
 */
export function normalizeSupportContact(raw: unknown): StructuredSupportContact | undefined {
  if (!raw) return undefined;

  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const contact: StructuredSupportContact = {};

    if (typeof obj.phone === 'string' && obj.phone.trim()) {
      contact.phone = obj.phone.trim();
    }
    if (typeof obj.telegram === 'string' && obj.telegram.trim()) {
      let tg = obj.telegram.trim();
      if (tg.startsWith('https://t.me/')) {
        contact.supportUrl = contact.supportUrl || tg;
        tg = '@' + tg.replace('https://t.me/', '');
      } else if (tg.startsWith('t.me/')) {
        contact.supportUrl = contact.supportUrl || `https://${tg}`;
        tg = '@' + tg.replace('t.me/', '');
      } else if (!tg.startsWith('@') && !tg.includes('/')) {
        tg = '@' + tg;
      }
      contact.telegram = tg;
    }
    if (typeof obj.email === 'string' && obj.email.trim()) {
      contact.email = obj.email.trim();
    }
    if (typeof obj.workingHours === 'string' && obj.workingHours.trim()) {
      contact.workingHours = obj.workingHours.trim();
    }
    if (typeof obj.supportUrl === 'string' && obj.supportUrl.trim()) {
      contact.supportUrl = obj.supportUrl.trim();
    }
    if (typeof obj.locale === 'string' && obj.locale.trim()) {
      contact.locale = obj.locale.trim();
    }

    return Object.keys(contact).length > 0 ? contact : undefined;
  }

  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return undefined;

    const contact: StructuredSupportContact = {};

    // 1. Check for URL
    if (text.startsWith('http://') || text.startsWith('https://')) {
      contact.supportUrl = text;
      if (text.includes('t.me/')) {
        const username = text.split('t.me/')[1]?.split(/[?#]/)[0];
        if (username) contact.telegram = `@${username}`;
      }
      return contact;
    }

    // 2. Check for Telegram handle or link
    if (text.startsWith('@') || text.startsWith('t.me/')) {
      const handle = text.startsWith('@') ? text : `@${text.replace('t.me/', '')}`;
      contact.telegram = handle;
      contact.supportUrl = `https://t.me/${handle.replace('@', '')}`;
      return contact;
    }

    // 3. Check for email
    if (text.includes('@') && text.includes('.') && !text.includes(' ') && !text.startsWith('+')) {
      contact.email = text;
      return contact;
    }

    // 4. Check for phone number pattern e.g. +998901234567, (71) 200-00-00
    const phoneMatch = text.match(/(\+?\d[\d\s().-]{6,}\d)/);
    if (phoneMatch) {
      contact.phone = phoneMatch[0].trim();
      const remaining = text.replace(phoneMatch[0], '').trim().replace(/^[,;-]\s*/, '');
      if (remaining && (remaining.includes(':') || remaining.toLowerCase().includes('0') || remaining.toLowerCase().includes('dushanba') || remaining.toLowerCase().includes('mon'))) {
        contact.workingHours = remaining;
      }
      return contact;
    }

    // Default fallback: assign to phone or workingHours
    if (text.includes(':') || text.includes('-')) {
      contact.workingHours = text;
    } else {
      contact.phone = text;
    }
    return contact;
  }

  return undefined;
}

/**
 * Public response sanitizer: ensures only official customer-facing support
 * fields are returned. Never leaks internal escalation or private developer notes.
 */
export function sanitizePublicSupportContact(
  contact: StructuredSupportContact | undefined
): StructuredSupportContact | undefined {
  if (!contact) return undefined;
  const safe: StructuredSupportContact = {};
  if (contact.phone) safe.phone = contact.phone;
  if (contact.telegram) safe.telegram = contact.telegram;
  if (contact.email) safe.email = contact.email;
  if (contact.workingHours) safe.workingHours = contact.workingHours;
  if (contact.supportUrl) safe.supportUrl = contact.supportUrl;
  if (contact.locale) safe.locale = contact.locale;
  return Object.keys(safe).length > 0 ? safe : undefined;
}
