// Anniversary / year-in-review derived state. The payoff arc for everything
// the app has been collecting — when the user's birthday week rolls around,
// surface a summary of the year just past.
import { derived } from 'svelte/store';
import { birthdate, todayAge } from './personal';
import { journal, milestones, books, letters } from './collections';
import { givingEntries, givingThisYear } from './financial';
import type { Mood, Milestone, JournalEntry } from '../types';

// Window: ±7 days around birthday. Calendar-day diff (not raw ms) so DST
// doesn't shift the window by an hour at the boundaries.
const ANNIVERSARY_WINDOW_DAYS = 7;

function dayOfYear(d: Date): number {
  // UTC-midnight day-of-year (DST-safe).
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start;
  return Math.floor(ms / 86400000);
}

// True when today is within ANNIVERSARY_WINDOW_DAYS of the user's birthday
// anniversary in either direction. Handles year-boundary wraparound
// (e.g. birthday Dec 30, today Jan 3).
export const isAnniversaryWindow = derived(birthdate, ($bd) => {
  if (!$bd) return false;
  const today = new Date();
  // Anniversary in the current calendar year — use the birthdate's month/day
  // but today's year, in UTC to match dayOfYear's basis.
  const anniversaryToday = new Date(
    Date.UTC(today.getUTCFullYear(), $bd.getMonth(), $bd.getDate()),
  );
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const a = dayOfYear(anniversaryToday);
  const t = dayOfYear(todayUTC);
  // Distance forward and backward around the 365/366-day cycle.
  const yearLen = 365; // close enough; off-by-one in leap years doesn't matter for ±7
  const fwd = (a - t + yearLen) % yearLen;
  const back = (t - a + yearLen) % yearLen;
  return Math.min(fwd, back) <= ANNIVERSARY_WINDOW_DAYS;
});

// Whose age are we celebrating? If we're just before the birthday, it's
// the age we're about to turn; if we're after, the age we just turned.
// During the window itself, return `$todayAge` (the user's current age).
export const celebrationAge = derived(
  [birthdate, todayAge],
  ([$bd, $age]) => {
    if (!$bd || $age < 0) return -1;
    const today = new Date();
    // If today's date is before the birthday this year, we're approaching
    // an age increment — celebrate the age they're about to be.
    const thisYearBday = new Date(today.getFullYear(), $bd.getMonth(), $bd.getDate());
    if (today < thisYearBday) return $age + 1;
    return $age;
  },
);

// ---- Year-in-review stats (all derived from existing stores). ----
// These compute against the last 365 calendar days from today, not strictly
// the age-year — which means during the window itself, "this year" means
// "the year leading up to your birthday."

interface JournalStats {
  count: number;
  avgMood: number | null;  // 1–5 scale; null if no entries with moods
  longestStreakWeeks: number;
}

interface YearInReview {
  journal: JournalStats;
  booksRead: number;
  milestonesCompleted: Milestone[];
  givingTotal: number;
  givingTargetMet: boolean;
  givingTargetPercent: number;
  // Letters the user wrote to a younger age that are "now or recent" —
  // they wrote to an age within ±2 years of who they are now.
  relevantLetters: { age: number; text: string }[];
}

const MOOD_VALUE: Record<Exclude<Mood, ''>, number> = {
  '😞': 1, '😕': 2, '😐': 3, '🙂': 4, '😄': 5,
};

function yearAgo(now: Date): Date {
  const d = new Date(now);
  d.setFullYear(now.getFullYear() - 1);
  return d;
}

export const yearInReview = derived(
  [journal, books, milestones, letters, givingEntries, givingThisYear, todayAge, celebrationAge],
  ([$journal, $books, $milestones, $letters, $giving, $givingThisYear, $todayAge, $celebrationAge]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = yearAgo(today);
    const cutoffISO = cutoff.toISOString().slice(0, 10);

    // Journal: entries keyed by week-start date string, filter to those
    // whose date is >= cutoff. Count + avgMood + longest-streak walk.
    const entryDates = Object.keys($journal)
      .filter((k) => k >= cutoffISO)
      .sort();
    const moods: number[] = [];
    for (const k of entryDates) {
      const e = $journal[k] as JournalEntry;
      const m = e?.mood;
      if (m && m !== '') moods.push(MOOD_VALUE[m as Exclude<Mood, ''>]);
    }
    const avgMood = moods.length
      ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10
      : null;

    // Longest streak: consecutive weeks (week-start date strings should
    // be exactly 7 calendar days apart for consecutive weeks).
    let longestStreakWeeks = 0;
    let cur = 0;
    let lastTs = -Infinity;
    for (const k of entryDates) {
      const ts = new Date(k).getTime();
      if (lastTs !== -Infinity && Math.abs(ts - lastTs - 7 * 86400000) < 86400000) {
        cur += 1;
      } else {
        cur = 1;
      }
      longestStreakWeeks = Math.max(longestStreakWeeks, cur);
      lastTs = ts;
    }

    // Books: filter to those tagged with the age year just ending.
    // The "year" we're celebrating is celebrationAge - 1 (the year they
    // just finished living).
    const yearJustFinished = $celebrationAge > 0 ? $celebrationAge - 1 : $todayAge;
    const booksRead = $books.filter((b) => b.age === yearJustFinished).length;

    // Milestones completed during the same age year.
    const milestonesCompleted = $milestones.filter(
      (m) => m.age === yearJustFinished && m.completed,
    );

    // Giving total for the last 365 days.
    const givingLast365 = $giving
      .filter((e) => e.date >= cutoffISO)
      .reduce((sum, e) => sum + e.amount, 0);
    // For target context, reuse givingThisYear (current calendar year sum);
    // they're similar but not identical. The "met goal" check uses calendar
    // year because the target itself is annual.
    const targetMet = $givingThisYear > 0 && givingLast365 >= $givingThisYear * 0.9;

    // Letters relevant to the moment: target age within ±2 of celebrationAge.
    const relevantLetters: { age: number; text: string }[] = [];
    for (const [ageStr, text] of Object.entries($letters)) {
      if (!text) continue;
      const age = parseInt(ageStr, 10);
      if (Math.abs(age - $celebrationAge) <= 2) {
        relevantLetters.push({ age, text });
      }
    }
    relevantLetters.sort((a, b) => a.age - b.age);

    const review: YearInReview = {
      journal: { count: entryDates.length, avgMood, longestStreakWeeks },
      booksRead,
      milestonesCompleted,
      givingTotal: givingLast365,
      givingTargetMet: targetMet,
      givingTargetPercent: 0, // computed below if useful
      relevantLetters,
    };
    return review;
  },
);
