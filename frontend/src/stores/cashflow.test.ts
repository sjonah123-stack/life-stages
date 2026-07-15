// Cash-flow (budget) store + pure helpers. Setup wipes LS per test
// (test/setup.ts) but the module-level store persists across tests in
// this file, so each test clears it explicitly.
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  cashflowEntries,
  budgetPlan,
  addCashflowEntry,
  deleteCashflowEntry,
  monthKey,
  summarizeMonth,
  expensesByCategory,
  lastMonths,
  annualizeIncome,
  actualSavingsRate,
  savedTowardGoal,
  normalizeBudgetPlan,
  isBudgetPlanEmpty,
  setFromCloud,
  CASHFLOW_CATEGORIES,
  SAVINGS_CATEGORY,
} from './financial';
import type { CashflowEntry } from '../types';

beforeEach(() => {
  cashflowEntries.set([]);
});

function mk(over: Partial<CashflowEntry> = {}): Omit<CashflowEntry, 'id'> {
  return {
    date: '2026-07-10',
    amount: 100,
    kind: 'expense',
    category: 'Food',
    ...over,
  };
}

describe('addCashflowEntry / deleteCashflowEntry', () => {
  it('adds with a generated id, newest-first ordering', () => {
    addCashflowEntry(mk({ date: '2026-07-01' }));
    addCashflowEntry(mk({ date: '2026-07-15' }));
    const list = get(cashflowEntries);
    expect(list).toHaveLength(2);
    expect(list[0].date).toBe('2026-07-15');
    expect(list[0].id).toBeTruthy();
    expect(list[0].id).not.toBe(list[1].id);
  });

  it('keeps optional note only when present', () => {
    addCashflowEntry(mk({ note: 'groceries' }));
    addCashflowEntry(mk({ date: '2026-07-11' }));
    const list = get(cashflowEntries);
    expect(list.find((e) => e.date === '2026-07-10')?.note).toBe('groceries');
    expect('note' in list.find((e) => e.date === '2026-07-11')!).toBe(false);
  });

  it('deletes by id', () => {
    const a = addCashflowEntry(mk());
    addCashflowEntry(mk({ date: '2026-07-11' }));
    deleteCashflowEntry(a.id);
    const list = get(cashflowEntries);
    expect(list).toHaveLength(1);
    expect(list[0].date).toBe('2026-07-11');
  });
});

describe('monthKey / lastMonths', () => {
  it('slices the YYYY-MM month key', () => {
    expect(monthKey('2026-07-10')).toBe('2026-07');
  });

  it('lastMonths walks back across a year boundary, oldest first', () => {
    expect(lastMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('summarizeMonth', () => {
  it('totals income and expenses for the month only', () => {
    const entries = [
      { id: '1', ...mk({ date: '2026-07-01', kind: 'income', category: 'Salary', amount: 3000 }) },
      { id: '2', ...mk({ date: '2026-07-05', amount: 800 }) },
      { id: '3', ...mk({ date: '2026-07-20', amount: 200 }) },
      { id: '4', ...mk({ date: '2026-06-20', amount: 999 }) }, // other month
    ] as CashflowEntry[];
    expect(summarizeMonth(entries, '2026-07')).toEqual({
      income: 3000,
      expenses: 1000,
      net: 2000,
    });
  });

  it('returns zeros for an empty month', () => {
    expect(summarizeMonth([], '2026-07')).toEqual({ income: 0, expenses: 0, net: 0 });
  });
});

describe('expensesByCategory', () => {
  it('groups expenses by category, largest first, income excluded', () => {
    const entries = [
      { id: '1', ...mk({ amount: 300, category: 'Housing' }) },
      { id: '2', ...mk({ amount: 100, category: 'Food' }) },
      { id: '3', ...mk({ amount: 150, category: 'Food' }) },
      { id: '4', ...mk({ kind: 'income', category: 'Salary', amount: 5000 }) },
    ] as CashflowEntry[];
    expect(expensesByCategory(entries, '2026-07')).toEqual([
      { category: 'Housing', total: 300 },
      { category: 'Food', total: 250 },
    ]);
  });
});

describe('setFromCloud (cashflow)', () => {
  it('normalizes malformed cloud entries', () => {
    setFromCloud({
      cashflowEntries: [
        { id: 'ok', date: '2026-07-01', amount: 50, kind: 'expense', category: 'Food' },
        { id: 'bad-date', date: 'July 1', amount: 50, kind: 'expense', category: 'Food' },
        { id: 'bad-amount', date: '2026-07-02', amount: -5, kind: 'expense', category: 'Food' },
        { id: 'bad-kind', date: '2026-07-03', amount: 50, kind: 'transfer', category: 'Food' },
        { id: 'no-category', date: '2026-07-04', amount: 50, kind: 'income' },
        'garbage',
      ],
    });
    const list = get(cashflowEntries);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('ok');
  });

  it('leaves the store untouched when the field is absent', () => {
    addCashflowEntry(mk());
    setFromCloud({});
    expect(get(cashflowEntries)).toHaveLength(1);
  });
});

describe('CASHFLOW_CATEGORIES', () => {
  it('excludes giving from expense categories (it has its own tracker)', () => {
    expect(CASHFLOW_CATEGORIES.expense.some((c) => /giv/i.test(c))).toBe(false);
  });

  it('includes Savings as pay-yourself-first', () => {
    expect(CASHFLOW_CATEGORIES.expense).toContain(SAVINGS_CATEGORY);
  });
});

describe('annualizeIncome', () => {
  const entries = [
    { id: '1', date: '2026-07-01', amount: 3000, kind: 'income', category: 'Salary' },
    { id: '2', date: '2026-06-15', amount: 3000, kind: 'income', category: 'Salary' },
    { id: '3', date: '2026-06-20', amount: 800, kind: 'expense', category: 'Food' },
  ] as CashflowEntry[];

  it('averages over months with data and scales to a year', () => {
    // $6,000 over 2 data months → $3,000/mo → $36,000/yr.
    expect(annualizeIncome(entries, '2026-07')).toBe(36000);
  });

  it('counts expense-only months as data months', () => {
    const withGap = [
      ...entries,
      { id: '4', date: '2026-05-10', amount: 100, kind: 'expense', category: 'Fun' },
    ] as CashflowEntry[];
    // $6,000 over 3 data months → $2,000/mo → $24,000/yr.
    expect(annualizeIncome(withGap, '2026-07')).toBe(24000);
  });

  it('ignores entries outside the trailing-12-month window', () => {
    const old = [
      { id: 'o', date: '2024-01-01', amount: 99999, kind: 'income', category: 'Salary' },
    ] as CashflowEntry[];
    expect(annualizeIncome(old, '2026-07')).toBe(0);
  });

  it('returns 0 with no data', () => {
    expect(annualizeIncome([], '2026-07')).toBe(0);
  });
});

describe('actualSavingsRate', () => {
  it('computes (income − expenses) / income over the window', () => {
    const entries = [
      { id: '1', date: '2026-07-01', amount: 4000, kind: 'income', category: 'Salary' },
      { id: '2', date: '2026-07-10', amount: 3000, kind: 'expense', category: 'Housing' },
    ] as CashflowEntry[];
    expect(actualSavingsRate(entries, '2026-07')).toBe(25);
  });

  it('returns null when no income is in the window', () => {
    const entries = [
      { id: '1', date: '2026-07-10', amount: 500, kind: 'expense', category: 'Food' },
    ] as CashflowEntry[];
    expect(actualSavingsRate(entries, '2026-07')).toBeNull();
    expect(actualSavingsRate([], '2026-07')).toBeNull();
  });

  it('goes negative when spending exceeds income', () => {
    const entries = [
      { id: '1', date: '2026-07-01', amount: 1000, kind: 'income', category: 'Salary' },
      { id: '2', date: '2026-07-10', amount: 1500, kind: 'expense', category: 'Travel' },
    ] as CashflowEntry[];
    expect(actualSavingsRate(entries, '2026-07')).toBe(-50);
  });
});

describe('savedTowardGoal', () => {
  const createdAt = new Date(2026, 5, 15).getTime(); // Jun 15 2026 local

  it('sums Savings-category expenses on/after the creation date', () => {
    const entries = [
      { id: '1', date: '2026-06-15', amount: 200, kind: 'expense', category: SAVINGS_CATEGORY },
      { id: '2', date: '2026-07-01', amount: 300, kind: 'expense', category: SAVINGS_CATEGORY },
      { id: '3', date: '2026-06-14', amount: 999, kind: 'expense', category: SAVINGS_CATEGORY }, // before creation
      { id: '4', date: '2026-07-02', amount: 500, kind: 'expense', category: 'Food' },           // not savings
      { id: '5', date: '2026-07-03', amount: 500, kind: 'income', category: 'Salary' },          // not an expense
    ] as CashflowEntry[];
    expect(savedTowardGoal(entries, createdAt)).toBe(500);
  });

  it('returns 0 with no savings logs', () => {
    expect(savedTowardGoal([], createdAt)).toBe(0);
  });
});

describe('normalizeBudgetPlan / isBudgetPlanEmpty', () => {
  it('keeps valid income + positive category targets', () => {
    const plan = normalizeBudgetPlan({
      expectedIncome: 4000,
      categories: { Housing: 1500, Food: 600, Junk: -5, Bad: 'x' },
    });
    expect(plan).toEqual({ expectedIncome: 4000, categories: { Housing: 1500, Food: 600 } });
    expect(isBudgetPlanEmpty(plan)).toBe(false);
  });

  it('degrades garbage to an empty plan', () => {
    expect(normalizeBudgetPlan('nope')).toEqual({ categories: {} });
    expect(normalizeBudgetPlan(null)).toEqual({ categories: {} });
    expect(normalizeBudgetPlan([1, 2])).toEqual({ categories: {} });
    expect(isBudgetPlanEmpty(normalizeBudgetPlan(null))).toBe(true);
  });

  it('drops non-positive expected income', () => {
    const plan = normalizeBudgetPlan({ expectedIncome: -100, categories: {} });
    expect('expectedIncome' in plan).toBe(false);
  });

  it('round-trips through setFromCloud', () => {
    budgetPlan.set({ categories: {} });
    setFromCloud({ budgetPlan: { expectedIncome: 5000, categories: { Food: 700 } } });
    expect(get(budgetPlan)).toEqual({ expectedIncome: 5000, categories: { Food: 700 } });
  });
});
