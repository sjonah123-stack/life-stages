// Horizontal swipe navigation between the top-nav pages, for the phone /
// PWA. A left swipe moves forward through TAB_PAGES, a right swipe moves
// back; no wrap-around. Settings sits outside TAB_PAGES and is neither a
// swipe source nor a target — it stays gear-only.
import { get } from 'svelte/store';
import { TAB_PAGES, currentPage, navigate, type Page } from './router';

// ---- Pure helpers (unit-tested) ----

// The page a horizontal gesture should land on, or null if none (at either
// end, on a page outside TAB_PAGES, or dx === 0). dx is finger movement:
// negative = finger moved left = advance to the next tab.
export function swipeTarget(current: Page, dx: number): Page | null {
  const idx = TAB_PAGES.indexOf(current);
  if (idx === -1 || dx === 0) return null;
  const next = dx < 0 ? idx + 1 : idx - 1;
  return TAB_PAGES[next] ?? null;
}

// Slide direction for the page transition: 1 = new page is to the right
// (slides in from the right), -1 = to the left, 0 = no directional slide
// (same page, or either side isn't a tab page — e.g. Settings).
export function slideDirection(from: Page, to: Page): 1 | -1 | 0 {
  const a = TAB_PAGES.indexOf(from);
  const b = TAB_PAGES.indexOf(to);
  if (a === -1 || b === -1 || a === b) return 0;
  return b > a ? 1 : -1;
}

// A gesture counts as a page swipe when it's decisively horizontal and
// quick: enough distance, clearly more horizontal than vertical, and not
// a slow drag.
export function qualifiesAsSwipe(dx: number, dy: number, elapsedMs: number): boolean {
  return Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy) && elapsedMs < 600;
}

// ---- The Svelte action ----

// True when the gesture started somewhere that owns horizontal movement:
// form controls (incl. the age range slider) or a horizontally scrollable
// ancestor (nav tab strip, habit chain).
function startsInIgnoredZone(target: EventTarget | null, boundary: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  let el: Element | null = target;
  while (el && el !== boundary) {
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function swipeNav(node: HTMLElement): { destroy(): void } {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let aborted = true;

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) {
      aborted = true;
      return;
    }
    aborted = startsInIgnoredZone(e.target, node);
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = performance.now();
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length > 1) aborted = true; // pinch — never a page swipe
  }

  function onTouchEnd(e: TouchEvent) {
    if (aborted) return;
    aborted = true;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!qualifiesAsSwipe(dx, dy, performance.now() - startTime)) return;
    const target = swipeTarget(get(currentPage), dx);
    if (target) navigate(target);
  }

  node.addEventListener('touchstart', onTouchStart, { passive: true });
  node.addEventListener('touchmove', onTouchMove, { passive: true });
  node.addEventListener('touchend', onTouchEnd, { passive: true });
  return {
    destroy() {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
    },
  };
}
