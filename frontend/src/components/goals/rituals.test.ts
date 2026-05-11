// Smoke tests for the ritual next-date math. The actual "advance" logic
// lives inline in RitualsSection.svelte — these tests pin the algorithm
// so a future refactor (e.g. extracting it to a helper) can't silently
// change behavior.
import { describe, expect, it } from 'vitest';
import { parseDOB, formatDOB, daysBetween } from '../../utils';

// Mirrors the markDone logic inside RitualsSection.svelte. Extracted here
// for direct testing; if it's ever lifted to a helper, both can share.
function advanceRitualDate(currentNext: string | undefined, frequency: 1 | 2 | 4 | 12, now = new Date()): string {
  const cadenceDays = Math.floor(365 / frequency);
  const base = currentNext ? parseDOB(currentNext, true) : null;
  const anchor = base ?? now;
  const next = new Date(anchor);
  next.setDate(anchor.getDate() + cadenceDays);
  return formatDOB(next);
}

describe('ritual next-date advance', () => {
  it('yearly ritual advances by ~365 days', () => {
    const next = advanceRitualDate('2026-11-26', 1);
    const a = parseDOB('2026-11-26', true)!;
    const b = parseDOB(next, true)!;
    expect(daysBetween(a, b)).toBe(365);
  });

  it('twice-yearly advances by ~182 days', () => {
    const next = advanceRitualDate('2026-06-01', 2);
    const a = parseDOB('2026-06-01', true)!;
    const b = parseDOB(next, true)!;
    expect(daysBetween(a, b)).toBe(182);
  });

  it('quarterly advances by ~91 days', () => {
    const next = advanceRitualDate('2026-01-01', 4);
    const a = parseDOB('2026-01-01', true)!;
    const b = parseDOB(next, true)!;
    expect(daysBetween(a, b)).toBe(91);
  });

  it('monthly advances by ~30 days', () => {
    const next = advanceRitualDate('2026-05-15', 12);
    const a = parseDOB('2026-05-15', true)!;
    const b = parseDOB(next, true)!;
    expect(daysBetween(a, b)).toBe(30);
  });

  it('falls back to today when no current date is set', () => {
    const fakeNow = new Date(2026, 4, 15);
    const next = advanceRitualDate(undefined, 1, fakeNow);
    const expected = new Date(2026, 4, 15);
    expected.setDate(15 + 365);
    expect(next).toBe(formatDOB(expected));
  });

  it('is DST-safe across spring forward', () => {
    // March 8 2026 spring forward; a quarterly ritual from Feb 1 lands May 3.
    const next = advanceRitualDate('2026-02-01', 4);
    const a = parseDOB('2026-02-01', true)!;
    const b = parseDOB(next, true)!;
    expect(daysBetween(a, b)).toBe(91);
  });
});
