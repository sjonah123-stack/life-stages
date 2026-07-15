import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { Achievement } from './achievements';

// Import-time state (persistedJSON reads LS once, `initialized` guard) means
// the seeding tests need a fresh module graph per test — same pattern as the
// "initial-load migration" tests in assessment.test.ts.
beforeEach(() => {
  vi.resetModules();
});

function mkAchievement(id: string, unlocked: boolean): Achievement {
  return {
    id,
    category: 'journal',
    emoji: '✍️',
    title: id,
    description: id,
    unlocked,
  };
}

describe('normalizeSeen', () => {
  it('preserves null (the never-seeded sentinel)', async () => {
    const { normalizeSeen } = await import('./achievement-notifier');
    expect(normalizeSeen(null)).toBeNull();
  });

  it('treats malformed input as unseeded', async () => {
    const { normalizeSeen } = await import('./achievement-notifier');
    expect(normalizeSeen('garbage')).toBeNull();
    expect(normalizeSeen({ a: 1 })).toBeNull();
    expect(normalizeSeen(42)).toBeNull();
  });

  it('dedupes and drops non-string entries', async () => {
    const { normalizeSeen } = await import('./achievement-notifier');
    expect(normalizeSeen(['a', 'a', 7, '', null, 'b'])).toEqual(['a', 'b']);
  });

  it('keeps an empty array as seeded-but-empty', async () => {
    const { normalizeSeen } = await import('./achievement-notifier');
    expect(normalizeSeen([])).toEqual([]);
  });
});

describe('diffNewlyUnlocked', () => {
  it('returns only unlocked achievements not yet seen', async () => {
    const { diffNewlyUnlocked } = await import('./achievement-notifier');
    const all = [
      mkAchievement('locked', false),
      mkAchievement('seen-unlocked', true),
      mkAchievement('fresh', true),
    ];
    const fresh = diffNewlyUnlocked(all, new Set(['seen-unlocked']));
    expect(fresh.map((a) => a.id)).toEqual(['fresh']);
  });

  it('returns nothing when everything is seen or locked', async () => {
    const { diffNewlyUnlocked } = await import('./achievement-notifier');
    const all = [mkAchievement('a', true), mkAchievement('b', false)];
    expect(diffNewlyUnlocked(all, new Set(['a']))).toEqual([]);
  });
});

describe('initAchievementNotifier', () => {
  it('first run seeds currently-unlocked ids silently (no toast)', async () => {
    // Pre-existing data: one cash-flow entry → 'budget-first' is already unlocked.
    localStorage.setItem(
      'lifeStages.cashflowEntries',
      JSON.stringify([
        { id: 'c1', date: '2026-07-01', amount: 50, kind: 'expense', category: 'Food' },
      ]),
    );
    const notifier = await import('./achievement-notifier');
    const { toasts } = await import('./toasts');

    notifier.initAchievementNotifier();

    expect(get(notifier.seenAchievementIds)).toContain('budget-first');
    expect(get(toasts)).toHaveLength(0);
  });

  it('a genuine unlock after seeding pushes a toast and records it', async () => {
    const notifier = await import('./achievement-notifier');
    const { toasts } = await import('./toasts');
    const { addCashflowEntry } = await import('./financial');

    notifier.initAchievementNotifier();
    expect(get(notifier.seenAchievementIds)).toEqual([]); // seeded, empty

    addCashflowEntry({ date: '2026-07-01', amount: 50, kind: 'expense', category: 'Food' });

    const shown = get(toasts);
    expect(shown).toHaveLength(1);
    expect(shown[0].kind).toBe('achievement');
    expect(shown[0].title).toBe('First month on the books');
    expect(get(notifier.seenAchievementIds)).toContain('budget-first');
  });

  it('does not re-toast an id already in seen, even after re-lock', async () => {
    const notifier = await import('./achievement-notifier');
    const { toasts } = await import('./toasts');
    const { cashflowEntries, addCashflowEntry } = await import('./financial');

    notifier.initAchievementNotifier();
    addCashflowEntry({ date: '2026-07-01', amount: 50, kind: 'expense', category: 'Food' });
    const firstCount = get(toasts).length;
    expect(firstCount).toBe(1);

    // Delete the entry (badge re-locks), then add one back (re-unlocks).
    cashflowEntries.set([]);
    addCashflowEntry({ date: '2026-07-02', amount: 60, kind: 'expense', category: 'Food' });

    expect(get(toasts)).toHaveLength(firstCount); // no second toast
  });
});
