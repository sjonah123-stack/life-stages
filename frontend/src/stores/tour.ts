// First-time app tour. `tourSeen` is device-local by design (UX state,
// not user data — same reasoning as achievementsSeen; don't add it to
// CloudPayload). The tour auto-opens only on the blank→initialized
// transition (the moment the welcome wizard finishes), so a signed-in
// user on a fresh device never gets it forced on them — they can replay
// it from Settings instead.
import { writable } from 'svelte/store';
import { persistedJSON } from './persisted';

export const tourSeen = persistedJSON<boolean>('tourSeen', false, (raw) => raw === true);

export const tourOpen = writable(false);

// Pure decision rule (unit-tested): auto-open only on the transition out
// of blank state, and only if this device hasn't seen the tour.
export function shouldAutoOpenTour(
  wasBlank: boolean,
  isBlank: boolean,
  seen: boolean,
): boolean {
  return wasBlank && !isBlank && !seen;
}

export function openTour(): void {
  tourOpen.set(true);
}

export function completeTour(): void {
  tourSeen.set(true);
  tourOpen.set(false);
}
