import { describe, it, expect } from 'vitest';
import { journalPhotoPath, isDataUrl } from './photos';

describe('journalPhotoPath', () => {
  it('builds a per-user path from a week-start key', () => {
    expect(journalPhotoPath('abc123', '2026-06-22')).toBe('users/abc123/journal/2026-06-22.jpg');
  });
  it('sanitises unexpected characters in the key', () => {
    expect(journalPhotoPath('u', '2026/06/22 weird')).toBe('users/u/journal/2026_06_22_weird.jpg');
  });
});

describe('isDataUrl', () => {
  it('detects base64 data URLs (to migrate)', () => {
    expect(isDataUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
  });
  it('treats Storage URLs and empties as already-migrated / nothing to do', () => {
    expect(isDataUrl('https://firebasestorage.googleapis.com/v0/b/x/o/y')).toBe(false);
    expect(isDataUrl('')).toBe(false);
    expect(isDataUrl(undefined)).toBe(false);
  });
});
