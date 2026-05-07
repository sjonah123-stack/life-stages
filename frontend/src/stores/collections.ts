// Array/object collections backed by localStorage as JSON:
// milestones, journal, letters, places, people, books, rituals, plus
// goal-style scalars (priorities, bestYear, hardestYear).
//
// All stores here also stay in sync across browser tabs via the
// `storage` event — see persistedJSON / persistedNumber for the
// applyingExternal guard that prevents ping-pong loops.
import { writable, type Writable } from 'svelte/store';
import type {
  Milestone, Journal, LetterMap, Place, Person, Book, Ritual, DimensionKey,
} from '../types';
import { LS_PREFIX } from '../config';
import { readJSON, writeJSON, readLS, writeLS } from '../utils';

// ---- Generic JSON-persisted store ----

function persistedJSON<T>(key: string, initial: T): Writable<T> {
  const start = readJSON<T>(key, initial);
  const store = writable<T>(start);
  let applyingExternal = false;
  store.subscribe((val) => {
    if (applyingExternal) return;
    writeJSON(key, val);
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LS_PREFIX + key) return;
      if (e.newValue == null) return;
      try {
        applyingExternal = true;
        store.set(JSON.parse(e.newValue));
      } catch (err) { /* ignore */ }
      finally { applyingExternal = false; }
    });
  }
  return store;
}

// ---- Persisted scalar (number) ----

function persistedNumber(key: string, initial: number): Writable<number> {
  const raw = readLS(key);
  const start = raw == null ? initial : parseInt(raw, 10) || initial;
  const store = writable<number>(start);
  let applyingExternal = false;
  store.subscribe((val) => {
    if (applyingExternal) return;
    writeLS(key, String(val));
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LS_PREFIX + key) return;
      if (e.newValue == null) return;
      try {
        applyingExternal = true;
        store.set(parseInt(e.newValue, 10) || initial);
      } catch (err) { /* ignore */ }
      finally { applyingExternal = false; }
    });
  }
  return store;
}

// ---- Public stores ----

export const milestones = persistedJSON<Milestone[]>('milestones', []);
export const journal = persistedJSON<Journal>('journal', {});
export const letters = persistedJSON<LetterMap>('letters', {});
export const places = persistedJSON<Place[]>('places', []);
export const people = persistedJSON<Person[]>('people', []);
export const books = persistedJSON<Book[]>('books', []);
export const rituals = persistedJSON<Ritual[]>('rituals', []);

export const priorities = persistedJSON<DimensionKey[]>('priorities', []);
export const bestYear = persistedNumber('bestYear', 0);
export const hardestYear = persistedNumber('hardestYear', 0);
