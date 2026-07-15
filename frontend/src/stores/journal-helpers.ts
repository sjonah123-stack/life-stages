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
  // Use setDate (calendar-day arithmetic) instead of `+ N * 86400000`
  // (millisecond arithmetic). The ms version drifts an hour over each DST
  // transition; over decades that compounds into wrong week-start dates.
  const out = new Date(b);
  out.setDate(b.getDate() + weekIndex * 7);
  return out;
}

export function weekKey(weekIndex: number): DateString {
  return formatDOB(weekStartDate(weekIndex));
}

export function weekRangeStr(weekIndex: number): string {
  const start = weekStartDate(weekIndex);
  // setDate (calendar-day add) is DST-safe; `+ 6 * 86400000` ms can land on
  // 23:00 of the prior day if a DST transition falls inside the 6-day window.
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
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
  // Calendar-day diff via daysBetween (DST-safe). Then advance the birthdate
  // by N*7 days using setDate (also DST-safe). See weekStartDate above for
  // the same pattern and reasoning.
  const days = daysBetween(b, d);
  const out = new Date(b);
  out.setDate(b.getDate() + Math.floor(days / 7) * 7);
  return out;
}

// ---- Total weeks in the LIFESPAN window ----

export const TOTAL_WEEKS = LIFESPAN * 52;

// Reactive: set of all entry keys. Computed once per journal mutation rather
// than per consuming component, so renders that touch many cells (WeeksGrid)
// don't recompute the Set redundantly.
import { derived } from 'svelte/store';
export const entryKeySet = derived(journal, ($j) => new Set(Object.keys($j)));

// The future-letters UI was removed (2026-07); the `letters` store and its
// normalizer stay in collections.ts so existing letters still round-trip
// through cloud sync and surface on the anniversary card.
