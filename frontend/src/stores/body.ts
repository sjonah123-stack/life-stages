// Daily body / health log. One entry per day; each field optional so
// users can log just sleep some days, just weight others. Feeds the
// DailyCheckInCard on Today and thickens Physical Wealth's behavioral
// score (currently the thinnest of the five).
import { derived } from 'svelte/store';
import type { BodyEntry } from '../types';
import { persistedJSON } from './persisted';

// Strict YYYY-MM-DD validator: format AND real calendar date. Without
// the round-trip check, "2026-13-99" or "2026-02-30" would slip through.
function isYmd(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function normalizeEntries(input: unknown): BodyEntry[] {
  if (!Array.isArray(input)) return [];
  // Latest-wins for same-date duplicates (one entry per day).
  const seen = new Map<string, BodyEntry>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<BodyEntry>;
    if (!isYmd(r.date)) continue;
    const entry: BodyEntry = { date: r.date };
    if (isFiniteNumber(r.weight) && r.weight > 0) entry.weight = r.weight;
    if (isFiniteNumber(r.sleepHours) && r.sleepHours >= 0 && r.sleepHours <= 24) {
      entry.sleepHours = r.sleepHours;
    }
    if (isFiniteNumber(r.workoutMinutes) && r.workoutMinutes >= 0) {
      entry.workoutMinutes = r.workoutMinutes;
    }
    if (typeof r.note === 'string' && r.note) entry.note = r.note;
    // Skip entries that wound up empty after sanitization.
    if (
      entry.weight === undefined &&
      entry.sleepHours === undefined &&
      entry.workoutMinutes === undefined &&
      entry.note === undefined
    ) continue;
    seen.set(entry.date, entry);
  }
  // Newest first.
  return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// ---- Persisted writable ----

export const bodyEntries = persistedJSON<BodyEntry[]>(
  'bodyEntries',
  [],
  normalizeEntries,
);

// ---- Derived ----

export const latestBody = derived(bodyEntries, ($list) => $list[0] ?? null);

// Any entry within the past N days?
export function hasRecentBodyEntry($list: BodyEntry[], days: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoffMs = today.getTime() - days * 86400000;
  for (const e of $list) {
    if (new Date(e.date).getTime() >= cutoffMs) return true;
  }
  return false;
}

// ---- Mutations ----

export function addBodyEntry(entry: BodyEntry): void {
  bodyEntries.update((list) => {
    // Same-date overwrite. Merge new fields with the existing entry so a
    // partial update (just sleep, just weight) doesn't blank out the rest.
    const existing = list.find((e) => e.date === entry.date);
    const merged: BodyEntry = { date: entry.date };
    if (entry.weight ?? existing?.weight) merged.weight = entry.weight ?? existing?.weight;
    if (entry.sleepHours ?? existing?.sleepHours) merged.sleepHours = entry.sleepHours ?? existing?.sleepHours;
    if (entry.workoutMinutes ?? existing?.workoutMinutes) {
      merged.workoutMinutes = entry.workoutMinutes ?? existing?.workoutMinutes;
    }
    if (entry.note ?? existing?.note) merged.note = entry.note ?? existing?.note;
    const without = list.filter((e) => e.date !== entry.date);
    const next = [...without, merged];
    return next.sort((a, b) => b.date.localeCompare(a.date));
  });
}

export function deleteBodyEntry(date: string): void {
  bodyEntries.update((list) => list.filter((e) => e.date !== date));
}

// Cloud-sync entry point.
export function setFromCloud(cloud: { bodyEntries?: unknown }): void {
  if (cloud.bodyEntries !== undefined) {
    bodyEntries.set(normalizeEntries(cloud.bodyEntries));
  }
}
