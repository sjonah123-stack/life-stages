import { describe, it, expect } from 'vitest';
import { authTransition } from './auth';

// These rules guard the "data doesn't show up after login" regression: a
// sign-in from a logged-out session must LOAD cloud data, not wipe + reload.
describe('authTransition', () => {
  describe('initial settle on page load (wasInitialized = false)', () => {
    it('restored session → load cloud', () => {
      expect(authTransition(null, 'userA', false)).toBe('load-cloud');
    });
    it('no session → noop', () => {
      expect(authTransition(null, null, false)).toBe('noop');
    });
  });

  describe('after initial load (wasInitialized = true)', () => {
    it('sign-in from logged-out (null → user) loads cloud, never wipes', () => {
      expect(authTransition(null, 'userA', true)).toBe('load-cloud');
    });

    it('sign-out (user → null) wipes + reloads the device', () => {
      expect(authTransition('userA', null, true)).toBe('wipe-reload');
    });

    it('account switch (userA → userB) wipes + reloads', () => {
      expect(authTransition('userA', 'userB', true)).toBe('wipe-reload');
    });

    it('same user re-firing (user → same user) is a noop', () => {
      expect(authTransition('userA', 'userA', true)).toBe('noop');
    });

    it('still-logged-out re-fire (null → null) is a noop', () => {
      expect(authTransition(null, null, true)).toBe('noop');
    });
  });

  it('Firebase null-then-user double fire does not look like an account switch', () => {
    // Fire 1 (init): null settles as noop, marks initialized.
    expect(authTransition(null, null, false)).toBe('noop');
    // Fire 2: the real user arrives — must load, not wipe+reload (which would
    // have blanked the page in a loop).
    expect(authTransition(null, 'userA', true)).toBe('load-cloud');
  });
});
