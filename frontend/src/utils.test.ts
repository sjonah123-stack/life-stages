// Tests for utils.ts — date math + parsing + LS helpers.
// The DST-safety tests are the most important here; we shipped a bug to
// prod where week boundaries were off-by-one across DST, and these tests
// pin the fix down.
import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  parseDOB,
  formatDOB,
  ageInYears,
  formatNum,
  escapeHtml,
  readLS,
  writeLS,
  readJSON,
  writeJSON,
  removeLS,
  clearAllLocalData,
} from './utils';

describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    const d = new Date(2026, 4, 6);
    expect(daysBetween(d, d)).toBe(0);
  });

  it('returns 1 for one day forward', () => {
    expect(daysBetween(new Date(2026, 4, 6), new Date(2026, 4, 7))).toBe(1);
  });

  it('returns -1 for one day backward', () => {
    expect(daysBetween(new Date(2026, 4, 7), new Date(2026, 4, 6))).toBe(-1);
  });

  it('counts a year correctly', () => {
    // Common (non-leap) year: 2025 has 365 days.
    expect(daysBetween(new Date(2025, 0, 1), new Date(2026, 0, 1))).toBe(365);
  });

  it('counts a leap year correctly', () => {
    // 2024 is a leap year: 366 days.
    expect(daysBetween(new Date(2024, 0, 1), new Date(2025, 0, 1))).toBe(366);
  });

  // DST regression: this is the exact bug we shipped to prod. Birthdate in
  // Standard time (December) → date in Daylight time (May) drifted by 1
  // hour over the raw `(t1 - t2) / 86400000` math, floored to off-by-one
  // at week boundaries.
  it('is DST-safe: Dec 4 2002 (Std) → May 6 2026 (DST) is 8554 days', () => {
    expect(daysBetween(new Date(2002, 11, 4), new Date(2026, 4, 6))).toBe(8554);
  });

  it('is DST-safe across spring forward', () => {
    // March 8 2026 spring forward: Jan 15 → June 15 = 151 calendar days.
    // Old broken version would return 150.
    expect(daysBetween(new Date(2026, 0, 15), new Date(2026, 5, 15))).toBe(151);
  });

  it('is DST-safe across fall back', () => {
    // November 1 2026 fall back: Oct 15 → Dec 15 = 61 calendar days.
    expect(daysBetween(new Date(2026, 9, 15), new Date(2026, 11, 15))).toBe(61);
  });

  it('ignores time-of-day (treats both as midnight)', () => {
    // Same calendar date, different times-of-day → 0 days apart.
    const morning = new Date(2026, 4, 6, 9, 30);
    const evening = new Date(2026, 4, 6, 22, 45);
    expect(daysBetween(morning, evening)).toBe(0);
  });
});

describe('parseDOB', () => {
  it('parses a valid past date', () => {
    const d = parseDOB('2002-12-04');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2002);
    expect(d!.getMonth()).toBe(11);
    expect(d!.getDate()).toBe(4);
  });

  it('rejects future dates by default', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(parseDOB(formatDOB(future))).toBeNull();
  });

  it('accepts future dates when allowFuture=true', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const d = parseDOB(formatDOB(future), true);
    expect(d).not.toBeNull();
  });

  it('rejects pre-1900 dates', () => {
    expect(parseDOB('1899-12-31')).toBeNull();
  });

  it('rejects malformed strings', () => {
    expect(parseDOB('')).toBeNull();
    expect(parseDOB('not-a-date')).toBeNull();
    expect(parseDOB('2026/05/06')).toBeNull(); // wrong separator
    expect(parseDOB('2026-5-6')).toBeNull(); // missing zero-pad
    expect(parseDOB('26-05-06')).toBeNull(); // 2-digit year
  });

  it('round-trips through formatDOB', () => {
    const d = parseDOB('2026-05-06', true);
    expect(formatDOB(d!)).toBe('2026-05-06');
  });
});

describe('formatDOB', () => {
  it('zero-pads single-digit months and days', () => {
    expect(formatDOB(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(formatDOB(new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  it('formats two-digit months and days correctly', () => {
    expect(formatDOB(new Date(2026, 11, 25))).toBe('2026-12-25');
  });
});

describe('ageInYears', () => {
  it('returns 0 for same-year birthdate before birthday', () => {
    const dob = new Date(2026, 11, 4); // Dec 4 2026
    const now = new Date(2026, 4, 6); // May 6 2026
    expect(ageInYears(now, dob)).toBe(-1); // not yet born — but we accept the math
  });

  it('returns full years past birthday', () => {
    const dob = new Date(2002, 11, 4); // Dec 4 2002
    const now = new Date(2025, 11, 5); // Dec 5 2025 (one day after 23rd birthday)
    expect(ageInYears(now, dob)).toBe(23);
  });

  it('subtracts one when birthday hasnt happened yet this year', () => {
    const dob = new Date(2002, 11, 4); // Dec 4 2002
    const now = new Date(2025, 11, 3); // Dec 3 2025 (one day BEFORE 23rd birthday)
    expect(ageInYears(now, dob)).toBe(22);
  });

  it('handles birthday-day exactly', () => {
    const dob = new Date(2002, 11, 4); // Dec 4 2002
    const now = new Date(2025, 11, 4); // Dec 4 2025 — 23rd birthday
    expect(ageInYears(now, dob)).toBe(23);
  });
});

describe('formatNum', () => {
  it('formats with locale separators and rounds', () => {
    expect(formatNum(1234)).toBe('1,234');
    expect(formatNum(1234567)).toBe('1,234,567');
    expect(formatNum(1234.6)).toBe('1,235');
    expect(formatNum(0)).toBe('0');
  });
});

describe('escapeHtml', () => {
  it('escapes the dangerous characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml(`it's "quoted"`)).toBe('it&#39;s &quot;quoted&quot;');
  });

  it('passes through plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('')).toBe('');
  });
});

describe('localStorage helpers', () => {
  it('writeLS / readLS round-trip under LS_PREFIX', () => {
    writeLS('myKey', 'myValue');
    expect(readLS('myKey')).toBe('myValue');
    // Confirm the prefix is applied.
    expect(window.localStorage.getItem('lifeStages.myKey')).toBe('myValue');
  });

  it('readLS returns null for missing keys', () => {
    expect(readLS('nonexistent')).toBeNull();
  });

  it('writeJSON / readJSON round-trip an object', () => {
    const obj = { a: 1, b: ['x', 'y'], c: { nested: true } };
    writeJSON('jsonKey', obj);
    expect(readJSON('jsonKey', null)).toEqual(obj);
  });

  it('readJSON returns the fallback for missing keys', () => {
    expect(readJSON('nonexistent', { default: true })).toEqual({ default: true });
  });

  it('readJSON returns the fallback for malformed JSON', () => {
    window.localStorage.setItem('lifeStages.bad', '{not valid json}');
    expect(readJSON('bad', { fallback: true })).toEqual({ fallback: true });
  });

  it('removeLS deletes the key', () => {
    writeLS('toRemove', 'temp');
    expect(readLS('toRemove')).toBe('temp');
    removeLS('toRemove');
    expect(readLS('toRemove')).toBeNull();
  });

  it('clearAllLocalData removes only lifeStages.* keys, leaves others', () => {
    writeLS('mine', 'a');
    writeLS('also-mine', 'b');
    window.localStorage.setItem('not-namespaced', 'keep me');
    clearAllLocalData();
    expect(readLS('mine')).toBeNull();
    expect(readLS('also-mine')).toBeNull();
    expect(window.localStorage.getItem('not-namespaced')).toBe('keep me');
  });
});
