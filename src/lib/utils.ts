import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const DAY_MS = 86_400_000;
export const MIN_MS = 60_000;

export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Local YYYY-MM-DD key for streak / daily grouping. */
export function dayKey(d: Date | number = new Date()): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number = Date.now()): number {
  return startOfDay(ts) + DAY_MS - 1;
}

/**
 * Strip a leading article and surrounding punctuation, lowercase, and collapse
 * whitespace. Used both for dedup keys and for search matching.
 */
export function normalizeGerman(word: string): string {
  return word
    .toLowerCase()
    .replace(/^(der|die|das|ein|eine|den|dem|des)\s+/i, '')
    .replace(/[.,;:!?"„“”()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Loose normalization for search across any language. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

export function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Contains at least one Arabic-script codepoint. */
export function hasArabic(text: string): boolean {
  return /[؀-ۿݐ-ݿ]/.test(text);
}

/** Contains at least one Latin letter. */
export function hasLatin(text: string): boolean {
  return /[A-Za-zÄÖÜäöüß]/.test(text);
}

export function relativeDue(dueDate: number, now = Date.now()): string {
  const diff = dueDate - now;
  if (diff <= 0) return 'due';
  const mins = Math.round(diff / MIN_MS);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function formatDate(ts: number, locale = 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(ts);
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}
