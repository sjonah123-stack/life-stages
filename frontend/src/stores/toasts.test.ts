import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { toasts, pushToast, dismissToast, DEFAULT_DURATION } from './toasts';

beforeEach(() => {
  vi.useFakeTimers();
  // Drain any toasts left by a previous test.
  for (const t of get(toasts)) dismissToast(t.id);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toasts store', () => {
  it('pushToast returns an id and adds the toast', () => {
    const id = pushToast({ kind: 'info', title: 'Hello' });
    const list = get(toasts);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(id);
    expect(list[0].title).toBe('Hello');
  });

  it('auto-expires after the default duration', () => {
    pushToast({ kind: 'info', title: 'Bye' });
    vi.advanceTimersByTime(DEFAULT_DURATION - 1);
    expect(get(toasts)).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(get(toasts)).toHaveLength(0);
  });

  it('respects a custom duration', () => {
    pushToast({ kind: 'info', title: 'Quick', duration: 500 });
    vi.advanceTimersByTime(500);
    expect(get(toasts)).toHaveLength(0);
  });

  it('caps the stack at 3, dropping the oldest', () => {
    pushToast({ kind: 'info', title: 'one' });
    pushToast({ kind: 'info', title: 'two' });
    pushToast({ kind: 'info', title: 'three' });
    pushToast({ kind: 'info', title: 'four' });
    const list = get(toasts);
    expect(list).toHaveLength(3);
    expect(list.map((t) => t.title)).toEqual(['two', 'three', 'four']);
  });

  it('manual dismiss removes the toast and cancels its timer', () => {
    const id = pushToast({ kind: 'info', title: 'gone' });
    dismissToast(id);
    expect(get(toasts)).toHaveLength(0);
    // Advancing past expiry must not throw or resurrect anything.
    vi.advanceTimersByTime(DEFAULT_DURATION * 2);
    expect(get(toasts)).toHaveLength(0);
  });
});
