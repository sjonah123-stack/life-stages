// Finance page state — net-worth check-ins, savings (rate + one named
// goal), and charitable-giving log. Backs the Finance page and feeds into
// Financial Wealth's behavioral score in stores/assessment.ts.
//
// Same patterns as stores/assessment.ts: persisted lists with a
// `normalize` hook that drops malformed entries on read, a `setFromCloud`
// entry-point that the cloud-sync layer routes to without knowing schema
// internals, and crypto.randomUUID-based ids for goals.
import { derived } from 'svelte/store';
import type { NetWorthEntry, SavingsGoal, GivingEntry } from '../types';
import { persisted, persistedJSON } from './persisted';

const num = (raw: string) => parseFloat(raw) || 0;
const numStr = (v: number) => String(v);

// ---- Internal: id helper ----

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Normalizers ----
// All four stores load through these so a malformed cloud doc or
// hand-edited LS can't poison the writable.

function isYmd(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeNetWorthEntries(input: unknown): NetWorthEntry[] {
  if (!Array.isArray(input)) return [];
  // Latest-wins for same-date duplicates (the UI also enforces this on
  // write, but normalizing on read keeps cloud-replicated state clean
  // even if a write race ever produced a duplicate).
  const seen = new Map<string, NetWorthEntry>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<NetWorthEntry>;
    if (!isYmd(r.date)) continue;
    if (typeof r.amount !== 'number' || !Number.isFinite(r.amount)) continue;
    seen.set(r.date, {
      date: r.date,
      amount: r.amount,
      ...(typeof r.note === 'string' && r.note ? { note: r.note } : {}),
    });
  }
  // Newest first.
  return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function normalizeGivingEntries(input: unknown): GivingEntry[] {
  if (!Array.isArray(input)) return [];
  const seen = new Map<string, GivingEntry>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<GivingEntry>;
    if (!isYmd(r.date)) continue;
    if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount < 0) continue;
    // Same-date keys collide; use date+recipient as the dedup key so a
    // single day can have multiple gifts to different orgs.
    const key = `${r.date}|${r.recipient ?? ''}`;
    seen.set(key, {
      date: r.date,
      amount: r.amount,
      ...(typeof r.recipient === 'string' && r.recipient ? { recipient: r.recipient } : {}),
    });
  }
  return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function normalizeGoals(input: unknown): SavingsGoal[] {
  if (!Array.isArray(input)) return [];
  const out: SavingsGoal[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<SavingsGoal>;
    if (typeof r.label !== 'string' || !r.label) continue;
    if (typeof r.target !== 'number' || !Number.isFinite(r.target) || r.target <= 0) continue;
    out.push({
      id: r.id ?? makeId(),
      label: r.label,
      target: r.target,
      ...(isYmd(r.deadline) ? { deadline: r.deadline } : {}),
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    });
  }
  return out;
}

// ---- Persisted writables ----

export const netWorthEntries = persistedJSON<NetWorthEntry[]>(
  'netWorthEntries',
  [],
  normalizeNetWorthEntries,
);

export const savingsGoals = persistedJSON<SavingsGoal[]>(
  'savingsGoals',
  [],
  normalizeGoals,
);

// Stored as a plain string-encoded number (matches bestYear / hardestYear).
// Values outside [0, 100] are clamped on write via setSavingsRate.
export const savingsRate = persisted<number>('savingsRate', 0, num, numStr);

export const givingEntries = persistedJSON<GivingEntry[]>(
  'givingEntries',
  [],
  normalizeGivingEntries,
);

// ---- Derived ----

export const latestNetWorth = derived(
  netWorthEntries,
  ($list) => $list[0] ?? null,
);

// Sum of giving entries dated within the current calendar year (local TZ).
export const givingThisYear = derived(givingEntries, ($list) => {
  const year = new Date().getFullYear();
  let sum = 0;
  for (const e of $list) {
    if (e.date.startsWith(String(year))) sum += e.amount;
  }
  return sum;
});

// Default annual giving target = 10% of latest net-worth amount. 0 when
// no NW entry exists (the GivingSection hides the block in that case).
export const givingTargetAnnual = derived(
  latestNetWorth,
  ($latest) => ($latest && $latest.amount > 0 ? Math.round($latest.amount * 0.1) : 0),
);

// ---- Mutations ----

export function addNetWorthEntry(entry: NetWorthEntry): void {
  netWorthEntries.update((list) => {
    // Same-date overwrites — keep one entry per day.
    const without = list.filter((e) => e.date !== entry.date);
    const next = [...without, entry];
    return next.sort((a, b) => b.date.localeCompare(a.date));
  });
}

export function deleteNetWorthEntry(date: string): void {
  netWorthEntries.update((list) => list.filter((e) => e.date !== date));
}

export function addGoal(input: { label: string; target: number; deadline?: string }): SavingsGoal {
  const goal: SavingsGoal = {
    id: makeId(),
    label: input.label,
    target: input.target,
    ...(input.deadline ? { deadline: input.deadline } : {}),
    createdAt: Date.now(),
  };
  savingsGoals.update((list) => [...list, goal]);
  return goal;
}

export function updateGoal(id: string, patch: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>): void {
  savingsGoals.update((list) =>
    list.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  );
}

export function deleteGoal(id: string): void {
  savingsGoals.update((list) => list.filter((g) => g.id !== id));
}

export function setSavingsRate(value: number): void {
  if (!Number.isFinite(value)) return;
  savingsRate.set(Math.max(0, Math.min(100, value)));
}

export function addGivingEntry(entry: GivingEntry): void {
  givingEntries.update((list) => {
    // Dedup on date + recipient; latest-wins for the same key.
    const key = `${entry.date}|${entry.recipient ?? ''}`;
    const without = list.filter((e) => `${e.date}|${e.recipient ?? ''}` !== key);
    const next = [...without, entry];
    return next.sort((a, b) => b.date.localeCompare(a.date));
  });
}

export function deleteGivingEntry(date: string, recipient?: string): void {
  givingEntries.update((list) =>
    list.filter((e) => !(e.date === date && (e.recipient ?? '') === (recipient ?? ''))),
  );
}

// ---- Cloud-sync entry point ----
// Mirrors stores/assessment.ts' setFromCloud: cloud-sync routes the whole
// payload here without knowing the schema internals. Each field falls
// through its own normalizer so partial / malformed payloads degrade
// gracefully rather than crashing the page.
export function setFromCloud(cloud: {
  netWorthEntries?: unknown;
  savingsGoals?: unknown;
  savingsRate?: unknown;
  givingEntries?: unknown;
}): void {
  if (cloud.netWorthEntries !== undefined) {
    netWorthEntries.set(normalizeNetWorthEntries(cloud.netWorthEntries));
  }
  if (cloud.savingsGoals !== undefined) {
    savingsGoals.set(normalizeGoals(cloud.savingsGoals));
  }
  if (cloud.savingsRate !== undefined) {
    const r = typeof cloud.savingsRate === 'number' ? cloud.savingsRate : 0;
    savingsRate.set(Math.max(0, Math.min(100, Number.isFinite(r) ? r : 0)));
  }
  if (cloud.givingEntries !== undefined) {
    givingEntries.set(normalizeGivingEntries(cloud.givingEntries));
  }
}
