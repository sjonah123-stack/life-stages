import { describe, it, expect } from 'vitest';
import { swipeTarget, slideDirection, qualifiesAsSwipe } from './swipe';

describe('swipeTarget', () => {
  it('swiping left (dx < 0) advances to the next tab', () => {
    expect(swipeTarget('journal', -100)).toBe('goals');
    expect(swipeTarget('today', -100)).toBe('journal');
  });

  it('swiping right (dx > 0) goes to the previous tab', () => {
    expect(swipeTarget('journal', 100)).toBe('today');
    expect(swipeTarget('progress', 100)).toBe('finance');
  });

  it('does not wrap at either end', () => {
    expect(swipeTarget('today', 100)).toBeNull();
    expect(swipeTarget('progress', -100)).toBeNull();
  });

  it('settings is not a swipe source', () => {
    expect(swipeTarget('settings', -100)).toBeNull();
    expect(swipeTarget('settings', 100)).toBeNull();
  });

  it('dx of 0 is not a swipe', () => {
    expect(swipeTarget('journal', 0)).toBeNull();
  });
});

describe('slideDirection', () => {
  it('forward navigation slides from the right', () => {
    expect(slideDirection('today', 'journal')).toBe(1);
    expect(slideDirection('today', 'progress')).toBe(1);
  });

  it('backward navigation slides from the left', () => {
    expect(slideDirection('goals', 'journal')).toBe(-1);
  });

  it('same page or settings on either side gives no direction', () => {
    expect(slideDirection('today', 'today')).toBe(0);
    expect(slideDirection('today', 'settings')).toBe(0);
    expect(slideDirection('settings', 'today')).toBe(0);
  });
});

describe('qualifiesAsSwipe', () => {
  it('accepts a quick decisive horizontal gesture', () => {
    expect(qualifiesAsSwipe(80, 10, 300)).toBe(true);
    expect(qualifiesAsSwipe(-80, -10, 300)).toBe(true);
  });

  it('rejects short movements', () => {
    expect(qualifiesAsSwipe(40, 0, 300)).toBe(false);
  });

  it('rejects diagonal gestures (scrolling)', () => {
    expect(qualifiesAsSwipe(80, 70, 300)).toBe(false);
  });

  it('rejects slow drags', () => {
    expect(qualifiesAsSwipe(80, 10, 900)).toBe(false);
  });
});
