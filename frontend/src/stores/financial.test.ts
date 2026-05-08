// Tests for the Finance-page store: net-worth check-ins, savings (rate
// + goal), and charitable giving log. The normalize hooks + setFromCloud
// matter most — they're the boundary between local and cloud state.
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  netWorthEntries,
  savingsGoals,
  savingsRate,
  givingEntries,
  latestNetWorth,
  givingThisYear,
  givingTargetAnnual,
  addNetWorthEntry,
  deleteNetWorthEntry,
  addGoal,
  updateGoal,
  deleteGoal,
  setSavingsRate,
  addGivingEntry,
  deleteGivingEntry,
  setFromCloud,
} from './financial';

beforeEach(() => {
  // Global setup wipes localStorage; we also reset the in-memory stores
  // so each test starts on a known baseline.
  netWorthEntries.set([]);
  savingsGoals.set([]);
  savingsRate.set(0);
  givingEntries.set([]);
});

describe('addNetWorthEntry', () => {
  it('adds a single entry and exposes it via latestNetWorth', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    expect(get(netWorthEntries)).toHaveLength(1);
    expect(get(latestNetWorth)?.amount).toBe(50000);
  });

  it('sorts newest-first by date string', () => {
    addNetWorthEntry({ date: '2026-01-08', amount: 30000 });
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    addNetWorthEntry({ date: '2026-03-08', amount: 40000 });
    const list = get(netWorthEntries);
    expect(list.map((e) => e.date)).toEqual(['2026-05-08', '2026-03-08', '2026-01-08']);
  });

  it('overwrites a same-date entry (keeps one per day)', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    addNetWorthEntry({ date: '2026-05-08', amount: 51500 });
    const list = get(netWorthEntries);
    expect(list).toHaveLength(1);
    expect(list[0].amount).toBe(51500);
  });

  it('preserves the optional note field', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000, note: 'big bonus' });
    expect(get(latestNetWorth)?.note).toBe('big bonus');
  });

  it('persists to lifeStages.netWorthEntries', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    const stored = JSON.parse(window.localStorage.getItem('lifeStages.netWorthEntries')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].amount).toBe(50000);
  });
});

describe('deleteNetWorthEntry', () => {
  it('removes by date, leaves others', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    addNetWorthEntry({ date: '2026-04-08', amount: 48000 });
    deleteNetWorthEntry('2026-04-08');
    const list = get(netWorthEntries);
    expect(list).toHaveLength(1);
    expect(list[0].date).toBe('2026-05-08');
  });

  it('is a no-op for an unknown date', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    deleteNetWorthEntry('1999-01-01');
    expect(get(netWorthEntries)).toHaveLength(1);
  });
});

describe('savings goals', () => {
  it('addGoal creates a new goal with id and createdAt', () => {
    const goal = addGoal({ label: 'Emergency fund', target: 10000 });
    expect(goal.id).toBeTruthy();
    expect(goal.createdAt).toBeGreaterThan(0);
    expect(goal.label).toBe('Emergency fund');
    expect(get(savingsGoals)).toHaveLength(1);
  });

  it('updateGoal patches fields by id without losing others', () => {
    const goal = addGoal({ label: 'House', target: 50000 });
    updateGoal(goal.id, { target: 75000 });
    const updated = get(savingsGoals)[0];
    expect(updated.target).toBe(75000);
    expect(updated.label).toBe('House');
    expect(updated.id).toBe(goal.id);
  });

  it('deleteGoal removes by id', () => {
    const a = addGoal({ label: 'A', target: 1000 });
    addGoal({ label: 'B', target: 2000 });
    deleteGoal(a.id);
    const list = get(savingsGoals);
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('B');
  });

  it('preserves an optional deadline', () => {
    const goal = addGoal({ label: 'House', target: 50000, deadline: '2030-01-01' });
    expect(goal.deadline).toBe('2030-01-01');
  });
});

describe('setSavingsRate', () => {
  it('clamps to [0, 100]', () => {
    setSavingsRate(150);
    expect(get(savingsRate)).toBe(100);
    setSavingsRate(-10);
    expect(get(savingsRate)).toBe(0);
  });

  it('accepts mid-range values', () => {
    setSavingsRate(18);
    expect(get(savingsRate)).toBe(18);
  });

  it('rejects non-finite values (no-op)', () => {
    setSavingsRate(25);
    setSavingsRate(NaN);
    expect(get(savingsRate)).toBe(25);
  });
});

describe('giving log', () => {
  it('addGivingEntry adds and sorts newest-first', () => {
    addGivingEntry({ date: '2026-01-15', amount: 200 });
    addGivingEntry({ date: '2026-04-22', amount: 500 });
    const list = get(givingEntries);
    expect(list[0].date).toBe('2026-04-22');
  });

  it('same date + same recipient overwrites; different recipient stacks', () => {
    addGivingEntry({ date: '2026-01-15', amount: 100, recipient: 'Food bank' });
    addGivingEntry({ date: '2026-01-15', amount: 150, recipient: 'Food bank' });
    addGivingEntry({ date: '2026-01-15', amount: 50, recipient: 'Library' });
    const list = get(givingEntries);
    expect(list).toHaveLength(2);
    const foodBank = list.find((e) => e.recipient === 'Food bank');
    expect(foodBank?.amount).toBe(150); // latest wins for same key
  });

  it('rejects negative or non-finite amounts at the normalize boundary', () => {
    setFromCloud({
      givingEntries: [
        { date: '2026-01-15', amount: 100 },
        { date: '2026-02-15', amount: -50 },
        { date: '2026-03-15', amount: NaN },
      ],
    });
    expect(get(givingEntries)).toHaveLength(1);
    expect(get(givingEntries)[0].amount).toBe(100);
  });

  it('deleteGivingEntry removes by date + recipient', () => {
    addGivingEntry({ date: '2026-01-15', amount: 100, recipient: 'A' });
    addGivingEntry({ date: '2026-01-15', amount: 200, recipient: 'B' });
    deleteGivingEntry('2026-01-15', 'A');
    const list = get(givingEntries);
    expect(list).toHaveLength(1);
    expect(list[0].recipient).toBe('B');
  });
});

describe('derived: givingThisYear', () => {
  it('sums entries dated within the current calendar year', () => {
    const thisYear = String(new Date().getFullYear());
    addGivingEntry({ date: `${thisYear}-01-15`, amount: 200 });
    addGivingEntry({ date: `${thisYear}-04-22`, amount: 500 });
    addGivingEntry({ date: '2024-12-31', amount: 9999 }); // prior year
    expect(get(givingThisYear)).toBe(700);
  });

  it('returns 0 when no current-year entries exist', () => {
    addGivingEntry({ date: '2024-06-15', amount: 100 });
    expect(get(givingThisYear)).toBe(0);
  });
});

describe('derived: givingTargetAnnual', () => {
  it('returns 10% of latest net worth (rounded), or 0 when no NW entry', () => {
    expect(get(givingTargetAnnual)).toBe(0);
    addNetWorthEntry({ date: '2026-05-08', amount: 48200 });
    expect(get(givingTargetAnnual)).toBe(4820);
  });

  it('updates when latest net worth changes', () => {
    addNetWorthEntry({ date: '2026-01-08', amount: 30000 });
    expect(get(givingTargetAnnual)).toBe(3000);
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    expect(get(givingTargetAnnual)).toBe(5000);
  });

  it('returns 0 when latest net worth is zero or negative', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 0 });
    expect(get(givingTargetAnnual)).toBe(0);
    addNetWorthEntry({ date: '2026-06-08', amount: -1000 });
    expect(get(givingTargetAnnual)).toBe(0);
  });
});

describe('setFromCloud', () => {
  it('replaces all four stores from a clean cloud payload', () => {
    setFromCloud({
      netWorthEntries: [{ date: '2026-05-08', amount: 50000 }],
      savingsGoals: [
        {
          id: 'g1',
          label: 'House',
          target: 100000,
          createdAt: 1000,
        },
      ],
      savingsRate: 22,
      givingEntries: [{ date: '2026-04-15', amount: 250, recipient: 'Local food bank' }],
    });
    expect(get(netWorthEntries)[0].amount).toBe(50000);
    expect(get(savingsGoals)[0].label).toBe('House');
    expect(get(savingsRate)).toBe(22);
    expect(get(givingEntries)[0].recipient).toBe('Local food bank');
  });

  it('drops malformed entries instead of corrupting the stores', () => {
    setFromCloud({
      netWorthEntries: [
        { date: '2026-05-08', amount: 50000 },
        { date: 'not-a-date', amount: 999 },
        { /* missing required fields */ },
        null,
      ],
      savingsGoals: [
        { label: '', target: 100, createdAt: 1 }, // empty label
        { label: 'Good', target: -50, createdAt: 1 }, // negative target
        { label: 'Real goal', target: 5000 },
      ],
      givingEntries: 'not-an-array',
    });
    expect(get(netWorthEntries)).toHaveLength(1);
    expect(get(savingsGoals)).toHaveLength(1);
    expect(get(savingsGoals)[0].label).toBe('Real goal');
    expect(get(givingEntries)).toEqual([]);
  });

  it('clamps cloud savingsRate to [0, 100]', () => {
    setFromCloud({ savingsRate: 250 });
    expect(get(savingsRate)).toBe(100);
    setFromCloud({ savingsRate: -5 });
    expect(get(savingsRate)).toBe(0);
  });

  it('skips fields not present in the payload (partial sync)', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    setSavingsRate(15);
    setFromCloud({ givingEntries: [{ date: '2026-01-15', amount: 100 }] });
    // Net worth + rate untouched.
    expect(get(netWorthEntries)).toHaveLength(1);
    expect(get(savingsRate)).toBe(15);
    expect(get(givingEntries)).toHaveLength(1);
  });

  it('mints fresh ids for goals missing them', () => {
    setFromCloud({
      savingsGoals: [{ label: 'No id goal', target: 1000 }],
    });
    const list = get(savingsGoals);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBeTruthy();
  });
});
