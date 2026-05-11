// Daily-cadence habits — the missing rung between rituals (annual) and
// milestones (one-time). Each habit has a check-list of dates; the UI
// renders a Seinfeld-style chain plus a current streak.
import { derived } from 'svelte/store';
import type { Habit, HabitCheck, WealthKey } from '../types';
import { persistedJSON } from './persisted';
import { formatDOB } from '../utils';

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isYmd(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ---- Normalizers (drop malformed input from LS/cloud) ----

function normalizeHabits(input: unknown): Habit[] {
  if (!Array.isArray(input)) return [];
  const out: Habit[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<Habit>;
    if (typeof r.label !== 'string' || !r.label) continue;
    out.push({
      id: r.id ?? makeId(),
      label: r.label,
      ...(typeof r.emoji === 'string' && r.emoji ? { emoji: r.emoji } : {}),
      ...(r.wealthKey ? { wealthKey: r.wealthKey } : {}),
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
      ...(typeof r.archivedAt === 'number' ? { archivedAt: r.archivedAt } : {}),
    });
  }
  return out;
}

function normalizeChecks(input: unknown): HabitCheck[] {
  if (!Array.isArray(input)) return [];
  // Dedup on (habitId, date) — one check per habit per day.
  const seen = new Map<string, HabitCheck>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<HabitCheck>;
    if (typeof r.habitId !== 'string' || !r.habitId) continue;
    if (!isYmd(r.date)) continue;
    seen.set(`${r.habitId}|${r.date}`, { habitId: r.habitId, date: r.date });
  }
  return [...seen.values()];
}

// ---- Persisted writables ----

export const habits = persistedJSON<Habit[]>('habits', [], normalizeHabits);
export const habitChecks = persistedJSON<HabitCheck[]>('habitChecks', [], normalizeChecks);

// ---- Derived ----

// Active (non-archived) habits, in createdAt order.
export const activeHabits = derived(habits, ($habits) =>
  $habits.filter((h) => !h.archivedAt).sort((a, b) => a.createdAt - b.createdAt),
);

// Set of "habitId|date" keys for fast lookup ("is this habit checked
// on this date?").
export const checkKeys = derived(habitChecks, ($checks) => {
  const set = new Set<string>();
  for (const c of $checks) set.add(`${c.habitId}|${c.date}`);
  return set;
});

// Today's date string, recomputed on store mounts. Kept as a Readable
// so streak/chain derivations can react to date changes — but it's
// essentially a constant within a session.
function todayStr(): string {
  return formatDOB(new Date());
}

// Current streak per habit: consecutive prior days (walking back from
// today) where the habit was checked. "Today not checked yet" is allowed
// up front — we look at yesterday-and-back if today is unchecked, so a
// streak doesn't break just because you haven't done today yet.
export function streakFor(habitId: string, $checks: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cur = new Date(today);
  // If today isn't checked, start counting from yesterday.
  if (!$checks.has(`${habitId}|${formatDOB(cur)}`)) {
    cur.setDate(cur.getDate() - 1);
  }
  let count = 0;
  while ($checks.has(`${habitId}|${formatDOB(cur)}`)) {
    count++;
    cur.setDate(cur.getDate() - 1);
    if (count > 3650) break; // safety: 10-year cap
  }
  return count;
}

// Last-N-days check list for a habit: returns [{date, done}], oldest to
// newest. Used for the Seinfeld chain visualization.
export function chainFor(
  habitId: string,
  $checks: Set<string>,
  days = 28,
): { date: string; done: boolean }[] {
  const out: { date: string; done: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = formatDOB(d);
    out.push({ date: ds, done: $checks.has(`${habitId}|${ds}`) });
  }
  return out;
}

// Any active habit checked in the past N days? Used by behavioralScores
// to thicken Mental/Physical Wealth signals.
export function anyHabitCheckedRecently($checks: HabitCheck[], days: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoffMs = today.getTime() - days * 86400000;
  for (const c of $checks) {
    const dt = new Date(c.date).getTime();
    if (dt >= cutoffMs) return true;
  }
  return false;
}

// ---- Mutations ----

export function addHabit(input: {
  label: string;
  emoji?: string;
  wealthKey?: WealthKey;
}): Habit {
  const habit: Habit = {
    id: makeId(),
    label: input.label,
    ...(input.emoji ? { emoji: input.emoji } : {}),
    ...(input.wealthKey ? { wealthKey: input.wealthKey } : {}),
    createdAt: Date.now(),
  };
  habits.update((list) => [...list, habit]);
  return habit;
}

export function archiveHabit(id: string): void {
  habits.update((list) =>
    list.map((h) => (h.id === id ? { ...h, archivedAt: Date.now() } : h)),
  );
}

export function deleteHabit(id: string): void {
  habits.update((list) => list.filter((h) => h.id !== id));
  // Also drop all checks for this habit so we don't leak orphan rows.
  habitChecks.update((list) => list.filter((c) => c.habitId !== id));
}

// Toggle a habit's check for a given date. If already checked, remove;
// otherwise add. Same-(habitId, date) is dedup'd by the store.
export function toggleHabitCheck(habitId: string, date: string = todayStr()): void {
  habitChecks.update((list) => {
    const idx = list.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx >= 0) {
      return list.filter((_, i) => i !== idx);
    }
    return [...list, { habitId, date }];
  });
}

// Cloud-sync entry point — mirrors stores/assessment.ts pattern.
export function setFromCloud(cloud: {
  habits?: unknown;
  habitChecks?: unknown;
}): void {
  if (cloud.habits !== undefined) habits.set(normalizeHabits(cloud.habits));
  if (cloud.habitChecks !== undefined) habitChecks.set(normalizeChecks(cloud.habitChecks));
}
