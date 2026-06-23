// Personalize panel state — birthdate, sex, theme, country, etc.
// Each writable here auto-persists to localStorage under LS_PREFIX.
import { derived } from 'svelte/store';
import type {
  Sex, Theme, Country, Partnership, CareerField, Smoking, ExerciseLevel, DateString,
} from '../types';
import { DEFAULT_DOB, DEFAULT_SEX, DEFAULT_THEME } from '../config';
import { parseDOB, ageInYears, daysBetween, formatDOB } from '../utils';
import { persisted } from './persisted';

const str = (v: string) => v;
const num = (raw: string) => parseInt(raw, 10) || 0;
const numStr = (v: number) => String(v);
const float = (raw: string) => parseFloat(raw) || 0;
const floatStr = (v: number) => String(v);

// ---- Public ----

// Stored as 'YYYY-MM-DD' string. '' means not yet set (blank-state).
export const dob = persisted<DateString>('dob', '', str, str);

export const sex = persisted<Sex>('sex', DEFAULT_SEX, (raw) => raw as Sex, str);

export const theme = persisted<Theme>('theme', DEFAULT_THEME, (raw) => raw as Theme, str);

export const country = persisted<Country>('country', '', (raw) => raw as Country, str);

export const partnership = persisted<Partnership>('partnership', '', (raw) => raw as Partnership, str);

export const kids = persisted<number>('kids', 0, num, numStr);

export const careerField = persisted<CareerField>('career', '', (raw) => raw as CareerField, str);

// Private (localStorage only — never URL or cloud-shareable share-link)
export const smoker = persisted<Smoking>('smoker', '', (raw) => raw as Smoking, str);
export const exerciseLevel = persisted<ExerciseLevel>('exercise', '', (raw) => raw as ExerciseLevel, str);
export const sleepHours = persisted<number>('sleep', 0, float, floatStr);
export const familyLongevity = persisted<number>('familyLongevity', 0, num, numStr);

// ---- Derived ----

// The actual Date object (or null when blank-state).
export const birthdate = derived(dob, ($dob) => parseDOB($dob));

// Age today, in whole years. -1 when no DOB set.
export const todayAge = derived(birthdate, ($bd) => {
  if (!$bd) return -1;
  return ageInYears(new Date(), $bd);
});

// Days lived (0 when no DOB).
export const daysLived = derived(birthdate, ($bd) => {
  if (!$bd) return 0;
  return daysBetween($bd, new Date());
});

// Weeks lived.
export const weeksLived = derived(daysLived, ($days) => Math.floor($days / 7));

// Whether the user is in blank-state (no real birthdate yet).
export const isBlankState = derived(dob, ($dob) => !$dob);

// ---- Theme ----
// The app now ships a single editorial palette (cream / charcoal / terracotta),
// so there is no <body> theme class to maintain. The `theme` store and field are
// kept only so existing local/cloud user docs continue to load without error.

// ---- Setter helpers (more ergonomic than .set() in some places) ----

export function setDOBFromString(value: string) {
  const d = parseDOB(value);
  if (d) dob.set(formatDOB(d));
}
