// Shared persistence helpers for Svelte stores backed by localStorage.
//
// All app state under `lifeStages.*` flows through these. They handle:
//   - reading the initial value (with fallback to `initial` on parse error)
//   - mirroring writes back to LS on every store change
//   - syncing across browser tabs via the `storage` event
//   - suppressing the write-back when the new value came from another tab
//     (the `applyingExternal` flag prevents two tabs ping-ponging forever)
import { writable, type Writable } from 'svelte/store';
import { LS_PREFIX } from '../config';
import { readLS, writeLS, readJSON, writeJSON } from '../utils';

// Generic string-encoded value. Use when you need custom parse/serialize
// (e.g. a number stored as decimal text, or an enum that should be validated).
export function persisted<T>(
  key: string,
  initial: T,
  parse: (raw: string) => T,
  serialize: (val: T) => string,
): Writable<T> {
  const stored = readLS(key);
  let start = initial;
  if (stored != null) {
    try { start = parse(stored); } catch { /* fall back to initial */ }
  }
  const store = writable<T>(start);

  let applyingExternal = false;
  store.subscribe((val) => {
    if (applyingExternal) return;
    writeLS(key, serialize(val));
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LS_PREFIX + key) return;
      if (e.newValue == null) return;
      try {
        applyingExternal = true;
        store.set(parse(e.newValue));
      } catch { /* ignore unparseable values */ }
      finally { applyingExternal = false; }
    });
  }
  return store;
}

// JSON-encoded value. The optional `normalize` runs over both the initial
// load and any cross-tab updates — use it to migrate older shapes, sort, or
// drop malformed entries.
export function persistedJSON<T>(
  key: string,
  initial: T,
  normalize?: (raw: unknown) => T,
): Writable<T> {
  const loaded = readJSON<unknown>(key, initial);
  const start = normalize ? normalize(loaded) : (loaded as T);
  const store = writable<T>(start);

  let applyingExternal = false;
  store.subscribe((val) => {
    if (applyingExternal) return;
    writeJSON(key, val);
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LS_PREFIX + key) return;
      if (e.newValue == null) return;
      try {
        applyingExternal = true;
        const parsed = JSON.parse(e.newValue);
        store.set(normalize ? normalize(parsed) : (parsed as T));
      } catch { /* ignore unparseable values */ }
      finally { applyingExternal = false; }
    });
  }
  return store;
}
