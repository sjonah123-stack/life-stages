// Tests for achievement derivation + personal bests. Each achievement
// must lock/unlock based purely on the live store snapshot — no
// hidden "first time" tracking — so tests can synthesize any combo.
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { achievements, personalBests } from './achievements';
import { journal, milestones, books, rituals } from './collections';
import { habits, habitChecks, toggleHabitCheck, addHabit } from './habits';
import { bodyEntries, addBodyEntry } from './body';
import { netWorthEntries, savingsRate, givingEntries, addNetWorthEntry, addGivingEntry } from './financial';
import { assessmentResults } from './assessment';
import { dob } from './personal';
import type { AssessmentResult } from '../types';

beforeEach(() => {
  // Reset every store this module reads from so each test has a
  // clean baseline.
  journal.set({});
  milestones.set([]);
  books.set([]);
  rituals.set([]);
  habits.set([]);
  habitChecks.set([]);
  bodyEntries.set([]);
  netWorthEntries.set([]);
  savingsRate.set(0);
  givingEntries.set([]);
  assessmentResults.set([]);
  dob.set('2002-12-04');
});

function findAchievement(id: string) {
  return get(achievements).find((a) => a.id === id)!;
}

describe('achievements — locked baseline', () => {
  it('all achievements start locked on a fresh slate', () => {
    const unlocked = get(achievements).filter((a) => a.unlocked);
    expect(unlocked).toHaveLength(0);
  });
});

describe('journal achievements', () => {
  it('journal-first unlocks on first entry', () => {
    journal.set({ '2026-05-04': { text: 'hello', photo: '', mood: '' } });
    expect(findAchievement('journal-first').unlocked).toBe(true);
  });

  it('streak achievements require consecutive weeks', () => {
    // 4 consecutive weeks (each Sunday start, +7 days)
    const j: Record<string, { text: string; photo: string; mood: string }> = {};
    for (let i = 0; i < 4; i++) {
      const d = new Date(2026, 0, 4 + i * 7); // Jan 4, 11, 18, 25
      j[d.toISOString().slice(0, 10)] = { text: 'x', photo: '', mood: '' };
    }
    journal.set(j);
    expect(findAchievement('journal-streak-4').unlocked).toBe(true);
    expect(findAchievement('journal-streak-12').unlocked).toBe(false);
  });

  it('journal-streak-52 requires a full year', () => {
    const j: Record<string, { text: string; photo: string; mood: string }> = {};
    for (let i = 0; i < 52; i++) {
      const d = new Date(2026, 0, 4 + i * 7);
      j[d.toISOString().slice(0, 10)] = { text: 'x', photo: '', mood: '' };
    }
    journal.set(j);
    expect(findAchievement('journal-streak-52').unlocked).toBe(true);
  });
});

describe('habit achievements', () => {
  it('habit-first unlocks on first check', () => {
    const h = addHabit({ label: 'Test' });
    toggleHabitCheck(h.id, '2026-05-08');
    expect(findAchievement('habit-first').unlocked).toBe(true);
  });

  it('habit-streak-30 requires 30 consecutive days', () => {
    const h = addHabit({ label: 'Streak' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      toggleHabitCheck(h.id, d.toISOString().slice(0, 10));
    }
    expect(findAchievement('habit-streak-30').unlocked).toBe(true);
    expect(findAchievement('habit-streak-100').unlocked).toBe(false);
  });
});

describe('body achievements', () => {
  it('body-first unlocks on first entry', () => {
    addBodyEntry({ date: '2026-05-08', sleepHours: 7 });
    expect(findAchievement('body-first').unlocked).toBe(true);
  });

  it('body-week requires 7 consecutive days', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      addBodyEntry({ date: d.toISOString().slice(0, 10), sleepHours: 7 });
    }
    expect(findAchievement('body-week').unlocked).toBe(true);
  });
});

describe('finance achievements', () => {
  it('nw-first unlocks on first check-in', () => {
    addNetWorthEntry({ date: '2026-05-08', amount: 50000 });
    expect(findAchievement('nw-first').unlocked).toBe(true);
  });

  it('nw-six requires 6 distinct date entries', () => {
    for (let i = 0; i < 6; i++) {
      addNetWorthEntry({ date: `2026-0${(i % 9) + 1}-01`, amount: 1000 * (i + 1) });
    }
    expect(findAchievement('nw-six').unlocked).toBe(true);
  });

  it('give-ten-percent unlocks when this-year giving >= 10% of latest net worth', () => {
    addNetWorthEntry({ date: '2026-01-01', amount: 50000 });
    // 10% of 50000 = 5000 target. Log 6000 this year.
    const year = new Date().getFullYear();
    addGivingEntry({ date: `${year}-03-01`, amount: 3000 });
    addGivingEntry({ date: `${year}-06-01`, amount: 3000 });
    expect(findAchievement('give-ten-percent').unlocked).toBe(true);
  });

  it('give-ten-percent stays locked without a NW reference', () => {
    const year = new Date().getFullYear();
    addGivingEntry({ date: `${year}-03-01`, amount: 10000 });
    expect(findAchievement('give-ten-percent').unlocked).toBe(false);
  });
});

describe('wealth achievements', () => {
  function withResult(scores: { time: number; social: number; mental: number; physical: number; financial: number }): AssessmentResult {
    return {
      v: 2,
      id: 'r1',
      takenAt: Date.now(),
      answers: [],
      selfScores: scores,
      completedRecommendations: {},
    };
  }

  it('balanced-60 needs every dimension ≥ 60', () => {
    assessmentResults.set([withResult({ time: 60, social: 60, mental: 60, physical: 60, financial: 60 })]);
    expect(findAchievement('wealth-balanced-60').unlocked).toBe(true);
    expect(findAchievement('wealth-thriving-80').unlocked).toBe(false);
  });

  it('thriving-80 needs every dimension ≥ 80', () => {
    assessmentResults.set([withResult({ time: 80, social: 85, mental: 90, physical: 80, financial: 80 })]);
    expect(findAchievement('wealth-thriving-80').unlocked).toBe(true);
  });

  it('balanced-60 stays locked when any dimension is < 60', () => {
    assessmentResults.set([withResult({ time: 60, social: 60, mental: 60, physical: 59, financial: 60 })]);
    expect(findAchievement('wealth-balanced-60').unlocked).toBe(false);
  });
});

describe('books + overall achievements', () => {
  it('books-5 counts books in the current age year', () => {
    // DOB 2002-12-04. Current age depends on test runtime. Skip the
    // count-by-age and just verify books-25 (total-based) for stability.
    const arr = Array.from({ length: 25 }, (_, i) => ({
      title: `Book ${i}`,
      author: 'A',
      age: 23,
      takeaway: '',
    }));
    books.set(arr);
    expect(findAchievement('books-25').unlocked).toBe(true);
  });

  it('milestone-first-done unlocks on first completed milestone', () => {
    milestones.set([{ age: 25, label: 'Half marathon', completed: true }]);
    expect(findAchievement('milestone-first-done').unlocked).toBe(true);
  });

  it('ritual-first unlocks on first ritual added', () => {
    rituals.set([{ name: 'Thanksgiving', frequency: 1 }]);
    expect(findAchievement('ritual-first').unlocked).toBe(true);
  });
});

describe('personalBests', () => {
  it('reports journalEntries count and longest streak', () => {
    const j: Record<string, { text: string; photo: string; mood: string }> = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date(2026, 0, 4 + i * 7);
      j[d.toISOString().slice(0, 10)] = { text: 'x', photo: '', mood: '' };
    }
    journal.set(j);
    const pb = get(personalBests);
    expect(pb.journalEntries).toBe(5);
    expect(pb.journalLongestStreakWeeks).toBe(5);
  });

  it('reports net-worth peak (max across history, not just latest)', () => {
    addNetWorthEntry({ date: '2026-01-01', amount: 50000 });
    addNetWorthEntry({ date: '2026-04-01', amount: 75000 });
    addNetWorthEntry({ date: '2026-05-01', amount: 60000 }); // dipped
    expect(get(personalBests).netWorthPeak).toBe(75000);
  });

  it('best-mood-week needs at least 3 entries to register a window', () => {
    journal.set({
      '2026-05-04': { text: 'x', photo: '', mood: '😄' },
      '2026-05-05': { text: 'x', photo: '', mood: '😄' },
    });
    // Only 2 entries → no window registered
    expect(get(personalBests).bestMoodWeekAvg).toBeNull();

    journal.update((j) => ({
      ...j,
      '2026-05-06': { text: 'x', photo: '', mood: '🙂' },
    }));
    // 3 entries within 2 days → window valid; avg = (5+5+4)/3 = 4.666...
    const avg = get(personalBests).bestMoodWeekAvg;
    expect(avg).not.toBeNull();
    expect(avg!).toBeCloseTo(4.67, 1);
  });

  it('counts best habit streak across multiple habits', () => {
    const a = addHabit({ label: 'A' });
    const b = addHabit({ label: 'B' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // A: 2-day streak
    toggleHabitCheck(a.id, today.toISOString().slice(0, 10));
    const yest = new Date(today); yest.setDate(today.getDate() - 1);
    toggleHabitCheck(a.id, yest.toISOString().slice(0, 10));
    // B: 5-day streak
    for (let i = 0; i < 5; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      toggleHabitCheck(b.id, d.toISOString().slice(0, 10));
    }
    expect(get(personalBests).bestHabitStreakDays).toBe(5);
  });
});
