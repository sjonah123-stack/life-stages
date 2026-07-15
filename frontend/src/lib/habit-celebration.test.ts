import { describe, it, expect } from 'vitest';
import { crossedMilestone, STREAK_MILESTONES } from './habit-celebration';

describe('crossedMilestone', () => {
  it('detects crossing the first milestone (6 → 7)', () => {
    expect(crossedMilestone(6, 7)).toBe(7);
  });

  it('returns null for an ordinary first check (0 → 1)', () => {
    expect(crossedMilestone(0, 1)).toBeNull();
  });

  it('detects 29 → 30', () => {
    expect(crossedMilestone(29, 30)).toBe(30);
  });

  it('detects 99 → 100', () => {
    expect(crossedMilestone(99, 100)).toBe(100);
  });

  it('returns null when already past a milestone (7 → 8)', () => {
    expect(crossedMilestone(7, 8)).toBeNull();
  });

  it('returns the highest milestone on a gap-jump (5 → 31 → 30, not 7)', () => {
    expect(crossedMilestone(5, 31)).toBe(30);
  });

  it('returns null when the streak decreases', () => {
    expect(crossedMilestone(30, 12)).toBeNull();
  });

  it('returns null when unchanged at a milestone (30 → 30)', () => {
    expect(crossedMilestone(30, 30)).toBeNull();
  });

  it('milestones are ascending (the highest-crossed logic depends on it)', () => {
    const sorted = [...STREAK_MILESTONES].sort((a, b) => a - b);
    expect([...STREAK_MILESTONES]).toEqual(sorted);
  });
});
