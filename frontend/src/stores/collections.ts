// Array/object collections backed by localStorage as JSON:
// milestones, journal, letters, places, people, books, rituals, plus
// goal-style scalars (priorities, bestYear, hardestYear).
import type {
  Milestone, Journal, LetterMap, Place, Person, Book, Ritual, DimensionKey,
} from '../types';
import { persisted, persistedJSON } from './persisted';

const num = (raw: string) => parseInt(raw, 10) || 0;
const numStr = (v: number) => String(v);

export const milestones = persistedJSON<Milestone[]>('milestones', []);
export const journal = persistedJSON<Journal>('journal', {});
export const letters = persistedJSON<LetterMap>('letters', {});
export const places = persistedJSON<Place[]>('places', []);
export const people = persistedJSON<Person[]>('people', []);
export const books = persistedJSON<Book[]>('books', []);
export const rituals = persistedJSON<Ritual[]>('rituals', []);

export const priorities = persistedJSON<DimensionKey[]>('priorities', []);
export const bestYear = persisted<number>('bestYear', 0, num, numStr);
export const hardestYear = persisted<number>('hardestYear', 0, num, numStr);
