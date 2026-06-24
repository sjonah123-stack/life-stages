import { describe, it, expect } from 'vitest';
import { shouldArchive, idsToPrune, MAX_VERSIONS } from './versioning';

describe('shouldArchive', () => {
  it('archives on update/delete (prior data existed)', () => {
    expect(shouldArchive(true, { data: { dob: '2002-12-04' } })).toBe(true);
  });
  it('does not archive on first creation (no prior data)', () => {
    expect(shouldArchive(false, null)).toBe(false);
    expect(shouldArchive(false, undefined)).toBe(false);
  });
  it('does not archive when before exists but has no data', () => {
    expect(shouldArchive(true, null)).toBe(false);
  });
});

describe('idsToPrune', () => {
  it('keeps the newest MAX_VERSIONS and prunes the rest', () => {
    const ids = Array.from({ length: MAX_VERSIONS + 3 }, (_, i) => `v${i}`);
    const pruned = idsToPrune(ids);
    expect(pruned).toEqual(['v20', 'v21', 'v22']);
  });
  it('prunes nothing when under the cap', () => {
    expect(idsToPrune(['a', 'b', 'c'])).toEqual([]);
  });
  it('respects a custom keep count', () => {
    expect(idsToPrune(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'd']);
  });
});
