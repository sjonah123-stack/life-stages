// Transient toast queue for the delight moments — badge unlocks, streak
// milestones. Deliberately small: max 3 on screen (oldest dropped), each
// auto-expires. Not persisted anywhere; a missed toast is just a missed
// nicety, never lost data.
import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  kind: 'achievement' | 'streak' | 'info';
  emoji?: string;
  title: string; // short — rendered in the serif display face
  body?: string; // one quiet sans line underneath
  duration?: number; // ms; default DEFAULT_DURATION
}

export const DEFAULT_DURATION = 4200;
const MAX_TOASTS = 3;

export const toasts = writable<Toast[]>([]);

let seq = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function pushToast(t: Omit<Toast, 'id'>): string {
  const id = `toast-${++seq}`;
  toasts.update((list) => {
    const next = [...list, { ...t, id }];
    // Drop the oldest beyond the cap (and cancel its expiry timer).
    while (next.length > MAX_TOASTS) {
      const dropped = next.shift()!;
      const timer = timers.get(dropped.id);
      if (timer) clearTimeout(timer);
      timers.delete(dropped.id);
    }
    return next;
  });
  timers.set(
    id,
    setTimeout(() => dismissToast(id), t.duration ?? DEFAULT_DURATION),
  );
  return id;
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  toasts.update((list) => list.filter((t) => t.id !== id));
}
