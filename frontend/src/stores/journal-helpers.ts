// Helpers around the `journal` store: per-entry get/set, week math.
import { get } from 'svelte/store';
import type { JournalEntry, DateString, Mood } from '../types';
import { LIFESPAN } from '../config';
import { formatDOB, ageInYears, daysBetween } from '../utils';
import { journal } from './collections';
import { birthdate } from './personal';

// ---- Per-entry helpers (handle backward-compat: legacy string entries) ----

export function getEntry(key: DateString): JournalEntry {
  const raw = (get(journal) as Record<string, unknown>)[key];
  if (raw == null) return { text: '', photo: '', mood: '' };
  if (typeof raw === 'string') return { text: raw, photo: '', mood: '' };
  const e = raw as Partial<JournalEntry>;
  return { text: e.text || '', photo: e.photo || '', mood: (e.mood as Mood) || '' };
}

export function setEntry(key: DateString, entry: JournalEntry): void {
  journal.update((j) => {
    const next = { ...j };
    if (!entry.text && !entry.photo && !entry.mood) {
      delete next[key];
    } else {
      next[key] = {
        text: entry.text || '',
        photo: entry.photo || '',
        mood: entry.mood || '',
      };
    }
    return next;
  });
}

export function deleteEntry(key: DateString): void {
  journal.update((j) => {
    const next = { ...j };
    delete next[key];
    return next;
  });
}

// ---- Week math (anchored to the user's birthdate) ----

function bd(): Date | null { return get(birthdate); }

export function weekStartDate(weekIndex: number): Date {
  const b = bd();
  if (!b) return new Date();
  return new Date(b.getTime() + weekIndex * 7 * 86400000);
}

export function weekKey(weekIndex: number): DateString {
  return formatDOB(weekStartDate(weekIndex));
}

export function weekRangeStr(weekIndex: number): string {
  const start = weekStartDate(weekIndex);
  const end = new Date(start.getTime() + 6 * 86400000);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const optsWithYear: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, optsWithYear)}`;
}

export function ageAtWeek(weekIndex: number): number {
  const b = bd();
  if (!b) return -1;
  return ageInYears(weekStartDate(weekIndex), b);
}

export function currentWeekIndex(): number {
  const b = bd();
  if (!b) return 0;
  return Math.floor(daysBetween(b, new Date()) / 7);
}

export function dateToWeekStart(d: Date): Date {
  const b = bd();
  if (!b) return d;
  const days = Math.floor((d.getTime() - b.getTime()) / 86400000);
  return new Date(b.getTime() + Math.floor(days / 7) * 7 * 86400000);
}

// ---- Total weeks in the LIFESPAN window ----

export const TOTAL_WEEKS = LIFESPAN * 52;
