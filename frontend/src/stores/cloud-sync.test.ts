import { describe, it, expect } from 'vitest';
import { isPayloadEmpty } from './cloud-sync';

// isPayloadEmpty guards the destructive case: refusing to overwrite a populated
// cloud doc with a blank local payload (the data-loss class).
describe('isPayloadEmpty', () => {
  it('treats null / undefined / {} as empty', () => {
    expect(isPayloadEmpty(null)).toBe(true);
    expect(isPayloadEmpty(undefined)).toBe(true);
    expect(isPayloadEmpty({})).toBe(true);
  });

  it('a fresh blank payload is empty', () => {
    expect(isPayloadEmpty({
      dob: '', milestones: [], people: [], books: [], rituals: [], priorities: [],
      netWorthEntries: [], savingsGoals: [], givingEntries: [],
      habits: [], habitChecks: [], bodyEntries: [], assessmentResults: [],
      journal: {}, letters: {},
    })).toBe(true);
  });

  it('a set birthdate alone counts as data', () => {
    expect(isPayloadEmpty({ dob: '2002-12-04' })).toBe(false);
  });

  it('any non-empty array counts as data', () => {
    expect(isPayloadEmpty({ milestones: [{ label: 'x' } as any] })).toBe(false);
    expect(isPayloadEmpty({ bodyEntries: [{} as any] })).toBe(false);
    expect(isPayloadEmpty({ assessmentResults: [{} as any] })).toBe(false);
  });

  it('a non-empty journal or letters map counts as data', () => {
    expect(isPayloadEmpty({ journal: { '2026-06-24': {} as any } })).toBe(false);
    expect(isPayloadEmpty({ letters: { 60: 'hello' } })).toBe(false);
  });

  it('empty arrays and empty maps do not count as data', () => {
    expect(isPayloadEmpty({ milestones: [], journal: {}, letters: {} })).toBe(true);
  });
});
