// Hash-based router for the 7 main pages. Reads/writes the URL fragment
// (#/today, #/journal, etc.) and exposes the active page as a Svelte store.

import { writable } from 'svelte/store';

export const PAGES = [
  'today',
  'journal',
  'people',
  'places',
  'reading',
  'goals',
  'wealth',
  'settings',
] as const;
export type Page = (typeof PAGES)[number];

export const PAGE_LABELS: Record<Page, string> = {
  today: 'Today',
  journal: 'Journal',
  people: 'People',
  places: 'Places',
  reading: 'Reading',
  goals: 'Goals',
  wealth: 'Wealth',
  settings: 'Settings',
};

// Tabs visible in the top-nav. Settings is reached via the gear icon.
export const TAB_PAGES: Page[] = [
  'today', 'journal', 'people', 'places', 'reading', 'goals', 'wealth',
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
