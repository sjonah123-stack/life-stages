// Tests for the daily body-log store: add/merge/delete, normalize
// defenses (out-of-range sleep, negative weight, NaN), recent-entry
// helper used by the wealth scoring.
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  bodyEntries,
  latestBody,
  hasRecentBodyEntry,
  addBodyEntry,
  deleteBodyEntry,
  setFromCloud,
} from './body';

beforeEach(() => {
  bodyEntries.set([]);
});

describe('addBodyEntry', () => {
  it('adds an entry and exposes it via latestBody', () => {
    addBodyEntry({ date: '2026-05-08', sleepHours: 7.5 });
    expect(get(bodyEntries)).toHaveLength(1);
    expect(get(latestBody)?.sleepHours).toBe(7.5);
  });

  it('sorts newest-first by date string', () => {
    addBodyEntry({ date: '2026-01-08', sleepHours: 8 });
    addBodyEntry({ date: '2026-05-08', sleepHours: 7 });
    addBodyEntry({ date: '2026-03-08', sleepHours: 6 });
    const list = get(bodyEntries);
    expect(list.map((e) => e.date)).toEqual(['2026-05-08', '2026-03-08', '2026-01-08']);
  });

  it('merges same-date entries instead of overwriting whole record', () => {
    // First save: just sleep
    addBodyEntry({ date: '2026-05-08', sleepHours: 7.5 });
    // Same day, only weight — sleep should NOT be wiped
    addBodyEntry({ date: '2026-05-08', weight: 170 });
    const list = get(bodyEntries);
    expect(list).toHaveLength(1);
    expect(list[0].sleepHours).toBe(7.5);
    expect(list[0].weight).toBe(170);
  });

  it('preserves note field across partial updates', () => {
    addBodyEntry({ date: '2026-05-08', sleepHours: 8, note: 'felt great' });
    addBodyEntry({ date: '2026-05-08', weight: 165 });
    const list = get(bodyEntries);
    expect(list[0].note).toBe('felt great');
    expect(list[0].weight).toBe(165);
  });
});

describe('deleteBodyEntry', () => {
  it('removes the entry by date', () => {
    addBodyEntry({ date: '2026-05-08', sleepHours: 7 });
    addBodyEntry({ date: '2026-05-09', sleepHours: 8 });
    deleteBodyEntry('2026-05-08');
    expect(get(bodyEntries)).toHaveLength(1);
    expect(get(bodyEntries)[0].date).toBe('2026-05-09');
  });

  it('is a no-op for an unknown date', () => {
    addBodyEntry({ date: '2026-05-08', sleepHours: 7 });
    deleteBodyEntry('1999-01-01');
    expect(get(bodyEntries)).toHaveLength(1);
  });
});

describe('hasRecentBodyEntry', () => {
  it('returns true for an entry within the window', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    const ds = recent.toISOString().slice(0, 10);
    addBodyEntry({ date: ds, sleepHours: 7 });
    expect(hasRecentBodyEntry(get(bodyEntries), 7)).toBe(true);
  });

  it('returns false for an entry outside the window', () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);
    const ds = old.toISOString().slice(0, 10);
    addBodyEntry({ date: ds, sleepHours: 7 });
    expect(hasRecentBodyEntry(get(bodyEntries), 7)).toBe(false);
  });

  it('returns false when there are no entries', () => {
    expect(hasRecentBodyEntry(get(bodyEntries), 7)).toBe(false);
  });
});

describe('setFromCloud (normalize)', () => {
  it('drops entries with bad dates', () => {
    setFromCloud({
      bodyEntries: [
        { date: '2026-05-08', sleepHours: 7 },
        { date: 'not-a-date', sleepHours: 6 },
        { date: '2026-13-99', sleepHours: 6 },  // invalid format
      ],
    });
    expect(get(bodyEntries)).toHaveLength(1);
    expect(get(bodyEntries)[0].date).toBe('2026-05-08');
  });

  it('drops out-of-range sleep values', () => {
    setFromCloud({
      bodyEntries: [
        { date: '2026-05-08', sleepHours: 30 },   // > 24
        { date: '2026-05-09', sleepHours: -1 },   // negative
        { date: '2026-05-10', sleepHours: NaN },
        { date: '2026-05-11', sleepHours: 8 },    // valid
      ],
    });
    const list = get(bodyEntries);
    // Only the last one survives — the others have all fields invalid, so
    // they're empty and get dropped entirely.
    expect(list).toHaveLength(1);
    expect(list[0].sleepHours).toBe(8);
  });

  it('drops negative or non-finite weight', () => {
    setFromCloud({
      bodyEntries: [
        { date: '2026-05-08', weight: -10 },
        { date: '2026-05-09', weight: NaN },
        { date: '2026-05-10', weight: 170 },
      ],
    });
    const list = get(bodyEntries);
    expect(list).toHaveLength(1);
    expect(list[0].weight).toBe(170);
  });

  it('keeps partial entries that have at least one valid field', () => {
    setFromCloud({
      bodyEntries: [
        { date: '2026-05-08', sleepHours: 7.5 },        // sleep only
        { date: '2026-05-09', weight: 168 },             // weight only
        { date: '2026-05-10', workoutMinutes: 45 },      // workout only
      ],
    });
    expect(get(bodyEntries)).toHaveLength(3);
  });

  it('returns [] for non-array payloads', () => {
    setFromCloud({ bodyEntries: 'not-an-array' });
    expect(get(bodyEntries)).toEqual([]);
  });
});
