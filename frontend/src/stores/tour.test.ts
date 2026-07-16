import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

beforeEach(() => {
  vi.resetModules();
});

describe('shouldAutoOpenTour', () => {
  it('opens only on the blank→initialized transition when unseen', async () => {
    const { shouldAutoOpenTour } = await import('./tour');
    expect(shouldAutoOpenTour(true, false, false)).toBe(true);
  });

  it('never opens when already seen on this device', async () => {
    const { shouldAutoOpenTour } = await import('./tour');
    expect(shouldAutoOpenTour(true, false, true)).toBe(false);
  });

  it('never opens on a plain load of an initialized app (fresh-device sign-in)', async () => {
    const { shouldAutoOpenTour } = await import('./tour');
    expect(shouldAutoOpenTour(false, false, false)).toBe(false);
  });

  it('never opens while still blank', async () => {
    const { shouldAutoOpenTour } = await import('./tour');
    expect(shouldAutoOpenTour(true, true, false)).toBe(false);
    expect(shouldAutoOpenTour(false, true, false)).toBe(false);
  });
});

describe('tour store', () => {
  it('completeTour marks seen and closes', async () => {
    const { tourOpen, tourSeen, openTour, completeTour } = await import('./tour');
    openTour();
    expect(get(tourOpen)).toBe(true);
    completeTour();
    expect(get(tourOpen)).toBe(false);
    expect(get(tourSeen)).toBe(true);
    expect(localStorage.getItem('lifeStages.tourSeen')).toBe('true');
  });

  it('normalizer coerces junk to false', async () => {
    localStorage.setItem('lifeStages.tourSeen', '"yes"');
    const { tourSeen } = await import('./tour');
    expect(get(tourSeen)).toBe(false);
  });
});
