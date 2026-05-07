// Array/object collections backed by localStorage as JSON:
// milestones, journal, letters, places, people, books, rituals, plus
// goal-style scalars (priorities, bestYear, hardestYear).
import type {
  Milestone, Journal, LetterMap, Place, Person, Book, Ritual, DimensionKey,
} from '../types';
import { persisted, persistedJSON } from './persisted';

const num = (raw: string) => parseInt(raw, 10) || 0;
const numStr = (v: number) => String(v);

// Defensive normalization for the `letters` map: drop any non-numeric or
// out-of-range keys so a malformed cloud payload can't poison the store.
function normalizeLetters(raw: unknown): LetterMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: LetterMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const age = parseInt(k, 10);
    if (!Number.isFinite(age) || age < 1 || age > 120) continue;
    if (typeof v !== 'string') continue;
    out[age] = v;
  }
  return out;
}

export const milestones = persistedJSON<Milestone[]>('milestones', []);
export const journal = persistedJSON<Journal>('journal', {});
export const letters = persistedJSON<LetterMap>('letters', {}, normalizeLetters);
export const places = persistedJSON<Place[]>('places', []);
export const people = persistedJSON<Person[]>('people', []);
export const books = persistedJSON<Book[]>('books', []);
export const rituals = persistedJSON<Ritual[]>('rituals', []);

export const priorities = persistedJSON<DimensionKey[]>('priorities', []);
export const bestYear = persisted<number>('bestYear', 0, num, numStr);
export const hardestYear = persisted<number>('hardestYear', 0, num, numStr);
