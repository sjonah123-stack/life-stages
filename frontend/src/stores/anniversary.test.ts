// Tests for the anniversary window detection. The window is ±7 days
// around the user's birthday — works across year boundaries (e.g.
// birthday Dec 30, today Jan 3) and on the birthday itself.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { isAnniversaryWindow, celebrationAge } from './anniversary';
import { dob } from './personal';

beforeEach(() => {
  dob.set('');
  vi.useRealTimers();
});

function setNow(yyyy: number, mm: number, dd: number): void {
  vi.useFakeTimers();
  // Use local midnight; matches how personal.ts birthdate is constructed.
  vi.setSystemTime(new Date(yyyy, mm - 1, dd, 9));
}

describe('isAnniversaryWindow', () => {
  it('returns false when no DOB set', () => {
    expect(get(isAnniversaryWindow)).toBe(false);
  });

  it('is true on the birthday itself', () => {
    dob.set('2002-12-04');
    setNow(2026, 12, 4);
    expect(get(isAnniversaryWindow)).toBe(true);
  });

  it('is true 7 days before the birthday', () => {
    dob.set('2002-12-04');
    setNow(2026, 11, 27);
    expect(get(isAnniversaryWindow)).toBe(true);
  });

  it('is true 7 days after the birthday', () => {
    dob.set('2002-12-04');
    setNow(2026, 12, 11);
    expect(get(isAnniversaryWindow)).toBe(true);
  });

  it('is false outside the ±7 window', () => {
    dob.set('2002-12-04');
    setNow(2026, 6, 15);  // mid-year, miles from December
    expect(get(isAnniversaryWindow)).toBe(false);
  });

  it('handles year-boundary wraparound (birthday Dec 30, today Jan 3)', () => {
    dob.set('2002-12-30');
    setNow(2027, 1, 3);
    expect(get(isAnniversaryWindow)).toBe(true);
  });

  it('handles year-boundary wraparound the other direction (birthday Jan 2, today Dec 28)', () => {
    dob.set('2002-01-02');
    setNow(2026, 12, 28);
    expect(get(isAnniversaryWindow)).toBe(true);
  });
});

describe('celebrationAge', () => {
  it('returns the age the user is about to turn when before the birthday', () => {
    dob.set('2002-12-04');
    setNow(2026, 11, 28);  // a few days before Dec 4 birthday
    // User is currently 23; about to turn 24.
    expect(get(celebrationAge)).toBe(24);
  });

  it('returns the current age when on or after the birthday', () => {
    dob.set('2002-12-04');
    setNow(2026, 12, 4);
    expect(get(celebrationAge)).toBe(24);
  });

  it('returns the current age 7 days after the birthday', () => {
    dob.set('2002-12-04');
    setNow(2026, 12, 11);
    expect(get(celebrationAge)).toBe(24);
  });

  it('returns -1 with no DOB', () => {
    expect(get(celebrationAge)).toBe(-1);
  });
});
