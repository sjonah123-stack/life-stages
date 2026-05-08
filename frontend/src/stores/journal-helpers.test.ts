// Tests for journal-helpers — week math (DST regression coverage) and
// dynamic letter horizons (the boundary table from the spec).
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  weekStartDate,
  weekKey,
  dateToWeekStart,
  ageAtWeek,
  currentWeekIndex,
  letterHorizonsForAge,
  MAX_LETTER_AGE,
  TOTAL_WEEKS,
} from './journal-helpers';
import { dob } from './personal';

const BIRTHDATE = '2002-12-04'; // Wednesday

beforeEach(() => {
  // Seed birthdate so the week-math helpers (which read $birthdate) work.
  dob.set(BIRTHDATE);
});

describe('weekStartDate', () => {
  it('returns birthdate itself for week 0', () => {
    const ws = weekStartDate(0);
    expect(ws.getFullYear()).toBe(2002);
    expect(ws.getMonth()).toBe(11);
    expect(ws.getDate()).toBe(4);
  });

  it('advances exactly 7 calendar days per week (DST-safe)', () => {
    const w0 = weekStartDate(0);
    const w1 = weekStartDate(1);
    // Both should be Wednesday — same weekday.
    expect(w1.getDay()).toBe(w0.getDay());
  });

  it('week 1222 lands on May 6 2026 (the bug-repro week)', () => {
    const ws = weekStartDate(1222);
    expect(ws.getFullYear()).toBe(2026);
    expect(ws.getMonth()).toBe(4); // May
    expect(ws.getDate()).toBe(6);
  });

  it('handles a week that crosses a DST transition without drifting', () => {
    // Week start in late February 2026 → corresponding week start one week
    // later (which crosses spring-forward March 8 2026) should be exactly
    // 7 calendar days later, NOT 6 days 23h.
    const wA = weekStartDate(1213); // Mar 4 2026 if my arithmetic holds
    const wB = weekStartDate(1214);
    // 7 calendar days difference → both same weekday.
    expect(wB.getDay()).toBe(wA.getDay());
    // And calendar-day delta must be exactly 7.
    const calDiff = Math.round((wB.getTime() - wA.getTime()) / 86400000);
    // Across a spring forward this can read as 6.96 (rounds to 7) — the
    // round forgives the ms drift since we're checking calendar days.
    expect(calDiff).toBe(7);
  });
});

describe('weekKey', () => {
  it('formats as YYYY-MM-DD of the week start', () => {
    expect(weekKey(0)).toBe('2002-12-04');
    expect(weekKey(1222)).toBe('2026-05-06');
  });
});

describe('dateToWeekStart', () => {
  it('snaps a mid-week date to the Wednesday week start', () => {
    // May 8 2026 (Friday) → May 6 2026 (Wed)
    const d = new Date(2026, 4, 8);
    const ws = dateToWeekStart(d);
    expect(ws.getFullYear()).toBe(2026);
    expect(ws.getMonth()).toBe(4);
    expect(ws.getDate()).toBe(6);
  });

  it('returns the same date when input is already a week-start (DST regression)', () => {
    // The exact bug: May 6 2026 (Wed, week-start) used to return Apr 29
    // due to DST drift. Must return May 6.
    const d = new Date(2026, 4, 6);
    const ws = dateToWeekStart(d);
    expect(ws.getFullYear()).toBe(2026);
    expect(ws.getMonth()).toBe(4);
    expect(ws.getDate()).toBe(6);
  });

  it('round-trips with weekKey (key → parse → dateToWeekStart → same key)', () => {
    for (const idx of [0, 100, 1222, 2000]) {
      const key = weekKey(idx);
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const ws = dateToWeekStart(date);
      expect(weekKey(Math.round((ws.getTime() - weekStartDate(0).getTime()) / (7 * 86400000)))).toBe(key);
    }
  });
});

describe('ageAtWeek', () => {
  it('returns 0 at week 0 (the day you were born)', () => {
    expect(ageAtWeek(0)).toBe(0);
  });

  it('returns ages that increase monotonically', () => {
    const a0 = ageAtWeek(0);
    const a52 = ageAtWeek(52);
    const a1000 = ageAtWeek(1000);
    expect(a52).toBeGreaterThanOrEqual(a0);
    expect(a1000).toBeGreaterThan(a52);
  });
});

describe('currentWeekIndex', () => {
  it('returns a non-negative index when DOB is in the past', () => {
    expect(currentWeekIndex()).toBeGreaterThan(0);
  });

  it('returns 0 when DOB is unset (defensive default)', () => {
    dob.set('');
    expect(currentWeekIndex()).toBe(0);
  });
});

describe('TOTAL_WEEKS', () => {
  it('is LIFESPAN years × 52', () => {
    // 90 years × 52 = 4680. Pin it so a config drift catches our attention.
    expect(TOTAL_WEEKS).toBe(4680);
  });
});

describe('letterHorizonsForAge', () => {
  it('returns +5/+10/+20 for ages under 65', () => {
    expect(letterHorizonsForAge(23)).toEqual([28, 33, 43]);
    expect(letterHorizonsForAge(45)).toEqual([50, 55, 65]);
    expect(letterHorizonsForAge(64)).toEqual([69, 74, 84]);
  });

  it('returns +5/+10/+15 for ages 65–79', () => {
    expect(letterHorizonsForAge(65)).toEqual([70, 75, 80]);
    expect(letterHorizonsForAge(70)).toEqual([75, 80, 85]);
    expect(letterHorizonsForAge(79)).toEqual([84, 89, 94]);
  });

  it('returns +3/+7 for ages 80–87', () => {
    expect(letterHorizonsForAge(80)).toEqual([83, 87]);
    expect(letterHorizonsForAge(85)).toEqual([88, 92]);
    expect(letterHorizonsForAge(87)).toEqual([90, 94]);
  });

  it('returns just +3 for ages 88+', () => {
    expect(letterHorizonsForAge(88)).toEqual([91]);
    expect(letterHorizonsForAge(92)).toEqual([95]);
  });

  it('clamps target ages to MAX_LETTER_AGE (95)', () => {
    // 90 + 10 = 100 → clamp to 95. The 5/10/20 set collapses with dedup.
    const out = letterHorizonsForAge(90);
    expect(out.every((a) => a <= MAX_LETTER_AGE)).toBe(true);
  });

  it('falls back to fixed [40, 60, 80] when no DOB is set (age < 0)', () => {
    expect(letterHorizonsForAge(-1)).toEqual([40, 60, 80]);
  });

  it('drops dedup-collapsed targets so an entry never repeats', () => {
    // At age 92: 92+3=95, 92+7=99→95, 92+15=107→95. After dedup → [95].
    // (Note current rule for 88+ only emits +3, but verifying the dedup
    // and clamp logic is correct at a stress age.)
    const out = letterHorizonsForAge(92);
    const unique = new Set(out);
    expect(out.length).toBe(unique.size);
  });

  it('never emits a target ≤ current age', () => {
    for (const age of [23, 45, 65, 80, 88, 92, 95]) {
      const out = letterHorizonsForAge(age);
      expect(out.every((target) => target > age)).toBe(true);
    }
  });
});
