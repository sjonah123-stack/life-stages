// Generic helpers: date math, formatting, escaping, localStorage.
import type { DateString } from './types';
import { LS_PREFIX } from './config';

// ---- Date math ----

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export function ageInYears(now: Date, dob: Date): number {
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return years;
}

export function ageOnDate(dob: Date, atDate: Date): number {
  let years = atDate.getFullYear() - dob.getFullYear();
  const m = atDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && atDate.getDate() < dob.getDate())) years--;
  return years;
}

// ---- Date string parsing / formatting ----

export function parseDOB(str: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  if (isNaN(d.getTime())) return null;
  if (d > new Date()) return null;
  if (d.getFullYear() < 1900) return null;
  return d;
}

export function formatDOB(d: Date): DateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function prettyDOB(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

// ---- Number formatting ----

export function formatNum(n: number): string {
  return Math.round(n).toLocaleString();
}

// ---- HTML escaping (for places we still render strings as HTML) ----

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// ---- localStorage (typed, namespaced, fail-safe) ----

export function readLS(key: string): string | null {
  try {
    return localStorage.getItem(LS_PREFIX + key);
  } catch (e) {
    return null;
  }
}

export function writeLS(key: string, val: string): void {
  try {
    localStorage.setItem(LS_PREFIX + key, val);
  } catch (e) {
    /* swallow quota errors */
  }
}

export function removeLS(key: string): void {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch (e) {
    /* ignore */
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readLS(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

export function writeJSON(key: string, val: unknown): void {
  writeLS(key, JSON.stringify(val));
}

// Wipe every key under the LS_PREFIX namespace. Used at sign-out and on
// auth user-changes so no one's data leaks into another account's session.
export function clearAllLocalData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    /* ignore */
  }
}

// ---- Tiny debounce ----

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}
