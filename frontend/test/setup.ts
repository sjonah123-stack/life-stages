// Vitest setup — runs before each test file. jsdom gives us window /
// localStorage / document; this file extends matchers and resets state
// between tests so persisted-store tests don't bleed into each other.
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';

// Persisted stores read window.localStorage on initialization. To get a
// clean slate for each test, wipe localStorage before every test runs.
beforeEach(() => {
  window.localStorage.clear();
});

// Belt-and-suspenders: also clear after, in case a test errored out
// mid-write and the next test imports an already-mounted store module.
afterEach(() => {
  window.localStorage.clear();
});
