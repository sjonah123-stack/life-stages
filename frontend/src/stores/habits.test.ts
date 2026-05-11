// Tests for the habits store: add/delete/archive, toggle checks (with
// idempotent dedup), streak math (handles "today not yet done"), chain
// length, normalize defenses.
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  habits,
  habitChecks,
  activeHabits,
  checkKeys,
  streakFor,
  chainFor,
  anyHabitCheckedRecently,
  addHabit,
  archiveHabit,
  deleteHabit,
  toggleHabitCheck,
  setFromCloud,
} from './habits';
import { formatDOB } from '../utils';

beforeEach(() => {
  habits.set([]);
  habitChecks.set([]);
});

function todayStr(): string {
  return formatDOB(new Date());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return formatDOB(d);
}

describe('addHabit', () => {
  it('creates a habit with id + createdAt', () => {
    const h = addHabit({ label: 'Meditate 10 min' });
    expect(h.id).toBeTruthy();
    expect(h.createdAt).toBeGreaterThan(0);
    expect(h.label).toBe('Meditate 10 min');
    expect(get(habits)).toHaveLength(1);
  });

  it('preserves optional emoji and wealthKey', () => {
    const h = addHabit({ label: 'Gym', emoji: '💪', wealthKey: 'physical' });
    expect(h.emoji).toBe('💪');
    expect(h.wealthKey).toBe('physical');
  });
});

describe('archive vs delete', () => {
  it('archiveHabit hides from activeHabits but preserves history', () => {
    const h = addHabit({ label: 'Old habit' });
    toggleHabitCheck(h.id, '2026-01-01');
    archiveHabit(h.id);
    expect(get(activeHabits)).toHaveLength(0);
    expect(get(habits)).toHaveLength(1);  // soft-archive — still in the list
    expect(get(habitChecks)).toHaveLength(1);  // history preserved
  });

  it('deleteHabit removes the habit and all its checks', () => {
    const h = addHabit({ label: 'To kill' });
    toggleHabitCheck(h.id, '2026-01-01');
    toggleHabitCheck(h.id, '2026-01-02');
    deleteHabit(h.id);
    expect(get(habits)).toHaveLength(0);
    expect(get(habitChecks)).toHaveLength(0);
  });

  it('delete is scoped — leaves other habits and their checks intact', () => {
    const a = addHabit({ label: 'A' });
    const b = addHabit({ label: 'B' });
    toggleHabitCheck(a.id);
    toggleHabitCheck(b.id);
    deleteHabit(a.id);
    expect(get(habits)).toHaveLength(1);
    expect(get(habits)[0].id).toBe(b.id);
    expect(get(habitChecks)).toHaveLength(1);
    expect(get(habitChecks)[0].habitId).toBe(b.id);
  });
});

describe('toggleHabitCheck', () => {
  it('adds a check the first time', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id);
    expect(get(habitChecks)).toHaveLength(1);
    expect(get(habitChecks)[0].date).toBe(todayStr());
  });

  it('removes the check on second call (toggle off)', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id);
    toggleHabitCheck(h.id);
    expect(get(habitChecks)).toHaveLength(0);
  });

  it('does not duplicate same (habitId, date)', () => {
    const h = addHabit({ label: 'X' });
    // Simulate accidental double-add via cloud-sync race
    habitChecks.set([{ habitId: h.id, date: todayStr() }]);
    setFromCloud({ habitChecks: [
      { habitId: h.id, date: todayStr() },
      { habitId: h.id, date: todayStr() },  // dup
    ] });
    expect(get(habitChecks)).toHaveLength(1);
  });
});

describe('streakFor', () => {
  it('returns 0 when no checks at all', () => {
    const h = addHabit({ label: 'X' });
    expect(streakFor(h.id, get(checkKeys))).toBe(0);
  });

  it('counts consecutive days backwards from today', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id, daysAgo(0));
    toggleHabitCheck(h.id, daysAgo(1));
    toggleHabitCheck(h.id, daysAgo(2));
    expect(streakFor(h.id, get(checkKeys))).toBe(3);
  });

  it('does not break the streak if today is un-checked but yesterday is done', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id, daysAgo(1));
    toggleHabitCheck(h.id, daysAgo(2));
    // No check today — should still count 2.
    expect(streakFor(h.id, get(checkKeys))).toBe(2);
  });

  it('stops at the first missing day', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id, daysAgo(0));
    toggleHabitCheck(h.id, daysAgo(1));
    // skip day 2
    toggleHabitCheck(h.id, daysAgo(3));
    expect(streakFor(h.id, get(checkKeys))).toBe(2);
  });
});

describe('chainFor', () => {
  it('returns the requested number of days, oldest first', () => {
    const h = addHabit({ label: 'X' });
    const chain = chainFor(h.id, get(checkKeys), 7);
    expect(chain).toHaveLength(7);
    // First entry is 6 days ago, last is today.
    expect(chain[0].date).toBe(daysAgo(6));
    expect(chain[6].date).toBe(todayStr());
  });

  it('marks done cells correctly', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id, daysAgo(0));
    toggleHabitCheck(h.id, daysAgo(3));
    const chain = chainFor(h.id, get(checkKeys), 5);
    const doneDates = chain.filter((c) => c.done).map((c) => c.date);
    expect(doneDates).toContain(daysAgo(0));
    expect(doneDates).toContain(daysAgo(3));
    expect(doneDates).toHaveLength(2);
  });
});

describe('anyHabitCheckedRecently', () => {
  it('returns true when a check is within the window', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id, daysAgo(3));
    expect(anyHabitCheckedRecently(get(habitChecks), 7)).toBe(true);
  });

  it('returns false when all checks are outside the window', () => {
    const h = addHabit({ label: 'X' });
    toggleHabitCheck(h.id, daysAgo(30));
    expect(anyHabitCheckedRecently(get(habitChecks), 7)).toBe(false);
  });

  it('returns false when there are no checks', () => {
    expect(anyHabitCheckedRecently(get(habitChecks), 7)).toBe(false);
  });
});

describe('setFromCloud (normalize)', () => {
  it('drops malformed habits and checks', () => {
    setFromCloud({
      habits: [
        { label: 'Real one' },
        { /* no label */ },
        { label: '' },
        null,
      ],
      habitChecks: [
        { habitId: 'a', date: '2026-05-08' },
        { habitId: 'a', date: 'not-a-date' },
        { habitId: '', date: '2026-05-08' },
        { date: '2026-05-08' },  // no habitId
      ],
    });
    expect(get(habits)).toHaveLength(1);
    expect(get(habits)[0].label).toBe('Real one');
    expect(get(habitChecks)).toHaveLength(1);
  });

  it('dedups same (habitId, date) on read', () => {
    setFromCloud({
      habitChecks: [
        { habitId: 'a', date: '2026-05-08' },
        { habitId: 'a', date: '2026-05-08' },  // dup
        { habitId: 'a', date: '2026-05-09' },
        { habitId: 'b', date: '2026-05-08' },
      ],
    });
    expect(get(habitChecks)).toHaveLength(3);
  });

  it('mints fresh ids for habits missing them', () => {
    setFromCloud({ habits: [{ label: 'No id' }] });
    expect(get(habits)[0].id).toBeTruthy();
  });
});
