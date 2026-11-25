import { stripHtml } from '../../lib/taxonomy.js';

export const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

/** HTML (possibly entity-encoded) -> plain text. */
export const htmlToText = (html: string | null | undefined) => (html ? stripHtml(decodeEntities(html)) : '');

export const toDate = (v: unknown): Date | null => {
  if (v == null || v === '') return null;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Workday-style "Posted Today" / "Posted Yesterday" / "Posted 3 Days Ago" / "Posted 30+ Days Ago". */
export function parseRelativePosted(text: string | null | undefined, now = new Date()): Date | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const day = 86_400_000;
  if (t.includes('today')) return now;
  if (t.includes('yesterday')) return new Date(now.getTime() - day);
  const m = t.match(/(\d+)\+?\s*days?/);
  return m ? new Date(now.getTime() - Number(m[1]) * day) : null;
}

/** Rupees per year -> lakhs per annum (2 decimals). Returns null for other currencies. */
export const inrToLpa = (v: number | null | undefined, currency = 'INR') =>
  v && currency.toUpperCase() === 'INR' ? Math.round(v / 1000) / 100 : null;

/** Primary query term for providers that accept a single keyword. */
export const primaryRole = (roles: string[]) => roles.find(Boolean) ?? 'QA Engineer';
