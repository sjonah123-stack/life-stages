// Tests for the shared persistence helpers. These back every persisted
// store in the app, so a regression here would silently corrupt user data.
import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { persisted, persistedJSON } from './persisted';

describe('persisted (string-encoded)', () => {
  it('starts at the initial value when LS is empty', () => {
    const s = persisted<number>('counter', 0, (raw) => parseInt(raw, 10) || 0, String);
    expect(get(s)).toBe(0);
  });

  it('reads existing LS value via parse', () => {
    window.localStorage.setItem('lifeStages.counter', '42');
    const s = persisted<number>('counter', 0, (raw) => parseInt(raw, 10) || 0, String);
    expect(get(s)).toBe(42);
  });

  it('writes to LS via serialize on .set()', () => {
    const s = persisted<number>('counter', 0, (raw) => parseInt(raw, 10) || 0, String);
    s.set(7);
    expect(window.localStorage.getItem('lifeStages.counter')).toBe('7');
  });

  it('falls back to initial when parse throws', () => {
    window.localStorage.setItem('lifeStages.broken', 'not-a-number');
    const s = persisted<number>(
      'broken',
      99,
      (raw) => {
        const n = parseInt(raw, 10);
        if (isNaN(n)) throw new Error('not a number');
        return n;
      },
      String,
    );
    expect(get(s)).toBe(99);
  });

  it('uses LS_PREFIX (lifeStages.) for all keys', () => {
    const s = persisted<string>('themedKey', 'a', (v) => v, (v) => v);
    s.set('b');
    expect(window.localStorage.getItem('lifeStages.themedKey')).toBe('b');
    expect(window.localStorage.getItem('themedKey')).toBeNull();
  });
});

describe('persistedJSON', () => {
  it('starts at the initial value when LS is empty', () => {
    const s = persistedJSON<{ a: number }>('obj', { a: 0 });
    expect(get(s)).toEqual({ a: 0 });
  });

  it('reads existing JSON from LS', () => {
    window.localStorage.setItem('lifeStages.obj', JSON.stringify({ a: 9, b: 'x' }));
    const s = persistedJSON<Record<string, unknown>>('obj', {});
    expect(get(s)).toEqual({ a: 9, b: 'x' });
  });

  it('writes JSON to LS on .set()', () => {
    const s = persistedJSON<number[]>('list', []);
    s.set([1, 2, 3]);
    expect(window.localStorage.getItem('lifeStages.list')).toBe('[1,2,3]');
  });

  it('writes JSON to LS on .update()', () => {
    const s = persistedJSON<number[]>('list', []);
    s.update((arr) => [...arr, 5]);
    expect(JSON.parse(window.localStorage.getItem('lifeStages.list')!)).toEqual([5]);
  });

  it('runs the normalize hook on initial load', () => {
    window.localStorage.setItem('lifeStages.dirty', JSON.stringify({ ok: 1, junk: 'drop me' }));
    const normalize = (raw: unknown): { ok: number } => {
      const r = raw as Record<string, unknown>;
      return { ok: typeof r?.ok === 'number' ? r.ok : 0 };
    };
    const s = persistedJSON<{ ok: number }>('dirty', { ok: 0 }, normalize);
    expect(get(s)).toEqual({ ok: 1 });
  });

  it('normalize hook coerces malformed initial state', () => {
    window.localStorage.setItem('lifeStages.bad', JSON.stringify('a string instead of an object'));
    const normalize = (raw: unknown): Record<string, unknown> => {
      return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    };
    const s = persistedJSON<Record<string, unknown>>('bad', {}, normalize);
    expect(get(s)).toEqual({});
  });
});

describe('cross-tab sync (storage events)', () => {
  it('persistedJSON updates the store when another tab writes the LS key', () => {
    const s = persistedJSON<{ x: number }>('shared', { x: 0 });
    expect(get(s)).toEqual({ x: 0 });

    // Simulate another tab writing to LS, which fires a storage event in
    // this tab. jsdom's StorageEvent doesn't auto-fire — we dispatch it.
    const event = new StorageEvent('storage', {
      key: 'lifeStages.shared',
      newValue: JSON.stringify({ x: 99 }),
    });
    window.dispatchEvent(event);

    expect(get(s)).toEqual({ x: 99 });
  });

  it('ignores storage events for unrelated keys', () => {
    const s = persistedJSON<{ x: number }>('shared', { x: 0 });
    s.set({ x: 5 });

    const event = new StorageEvent('storage', {
      key: 'lifeStages.something-else',
      newValue: JSON.stringify({ x: 999 }),
    });
    window.dispatchEvent(event);

    expect(get(s)).toEqual({ x: 5 });
  });

  it('persisted (string-encoded) also handles storage events', () => {
    const s = persisted<number>('counter', 0, (raw) => parseInt(raw, 10) || 0, String);
    const event = new StorageEvent('storage', {
      key: 'lifeStages.counter',
      newValue: '42',
    });
    window.dispatchEvent(event);
    expect(get(s)).toBe(42);
  });
});
