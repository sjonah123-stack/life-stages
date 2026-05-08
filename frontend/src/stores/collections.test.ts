// Tests for the letters store's defensive normalization. Tests via
// module-level loadInitial (the only way the normalize hook fires) so we
// reset modules + dynamic-import after seeding LS.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

afterEach(() => {
  vi.resetModules();
});

describe('letters store — defensive load-time normalization', () => {
  it('keeps valid numeric-key string-value entries', async () => {
    window.localStorage.setItem(
      'lifeStages.letters',
      JSON.stringify({ '40': 'note to forty-self', '60': 'note to sixty-self' }),
    );
    vi.resetModules();
    const { letters } = await import('./collections');
    expect(get(letters)).toEqual({ 40: 'note to forty-self', 60: 'note to sixty-self' });
  });

  it('drops out-of-range ages (≤ 0 or > 120)', async () => {
    window.localStorage.setItem(
      'lifeStages.letters',
      JSON.stringify({ '40': 'keep', '0': 'drop', '-5': 'drop', '999': 'drop' }),
    );
    vi.resetModules();
    const { letters } = await import('./collections');
    expect(get(letters)).toEqual({ 40: 'keep' });
  });

  it('drops non-numeric keys', async () => {
    window.localStorage.setItem(
      'lifeStages.letters',
      JSON.stringify({ '40': 'keep', 'not-a-number': 'drop', '': 'drop' }),
    );
    vi.resetModules();
    const { letters } = await import('./collections');
    expect(get(letters)).toEqual({ 40: 'keep' });
  });

  it('drops non-string values', async () => {
    window.localStorage.setItem(
      'lifeStages.letters',
      JSON.stringify({ '40': 'keep', '60': 42, '80': null, '50': { obj: true } }),
    );
    vi.resetModules();
    const { letters } = await import('./collections');
    expect(get(letters)).toEqual({ 40: 'keep' });
  });

  it('returns {} for non-object payloads (string, number, array, null)', async () => {
    for (const bad of ['"a string"', '42', '[1,2,3]', 'null']) {
      window.localStorage.setItem('lifeStages.letters', bad);
      vi.resetModules();
      const { letters } = await import('./collections');
      expect(get(letters)).toEqual({});
    }
  });

  it('starts at {} when LS is absent', async () => {
    vi.resetModules();
    const { letters } = await import('./collections');
    expect(get(letters)).toEqual({});
  });
});
