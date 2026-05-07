// Selected age on the Today-page slider. Lives outside personal stores
// because it's not a persisted setting — it just tracks what the user
// is currently looking at.
import { writable, derived } from 'svelte/store';
import { todayAge } from './personal';
import { SLIDER_MAX } from '../config';
import { get } from 'svelte/store';

// Selected slider age. Initialised to today's age once it's known.
export const selectedAge = writable<number>(20);

// Sync to today's age whenever the personal todayAge store changes —
// but only if the user hasn't dragged the slider yet.
let userTouched = false;
export function markSliderUserTouched() { userTouched = true; }

todayAge.subscribe(($age) => {
  if ($age >= 0 && !userTouched) selectedAge.set($age);
});

export const isToday = derived([selectedAge, todayAge], ([$sel, $today]) => $sel === $today);
export const isPast  = derived([selectedAge, todayAge], ([$sel, $today]) => $today >= 0 && $sel < $today);
export const isFuture = derived([selectedAge, todayAge], ([$sel, $today]) => $today >= 0 && $sel > $today);

export { SLIDER_MAX };
