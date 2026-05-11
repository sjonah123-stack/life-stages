// Hash-based router. Reads/writes the URL fragment (#/today, #/journal, etc.)
// and exposes the active page as a Svelte store. Old hashes for retired pages
// (#/wealth, #/places, #/reading) fall through to Today via pageFromHash's
// default below — books moved into Goals as a section.

import { writable } from 'svelte/store';

export const PAGES = [
  'today',
  'journal',
  'people',
  'goals',
  'finance',
  'progress',
  'settings',
] as const;
export type Page = (typeof PAGES)[number];

export const PAGE_LABELS: Record<Page, string> = {
  today: 'Today',
  journal: 'Journal',
  people: 'People',
  goals: 'Goals',
  finance: 'Finance',
  progress: 'Progress',
  settings: 'Settings',
};

// Tabs visible in the top-nav. Settings is reached via the gear icon.
export const TAB_PAGES: Page[] = [
  'today', 'journal', 'people', 'goals', 'finance', 'progress',
];

function pageFromHash(hash: string): Page {
  const m = /^#\/(\w+)/.exec(hash);
  const candidate = m && m[1];
  return (candidate && (PAGES as readonly string[]).includes(candidate)
    ? (candidate as Page)
    : 'today');
}

export const currentPage = writable<Page>(pageFromHash(window.location.hash));

window.addEventListener('hashchange', () => {
  currentPage.set(pageFromHash(window.location.hash));
  // Scroll back to top so each page transition feels like a real navigation.
  window.scrollTo({ top: 0, behavior: 'instant' });
});

export function navigate(page: Page) {
  window.location.hash = `#/${page}`;
}
