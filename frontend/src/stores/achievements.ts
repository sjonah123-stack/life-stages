// Achievement definitions + lock-state derivation. Every achievement is
// derived from existing store data — no new persisted state. This keeps
// achievements honest (you can't "lose" them by clearing achievement-
// specific data) and avoids another migration path.
//
// Goal: gentle gamification that fits the long-horizon reflective ethos.
// No XP/levels, no "don't break your streak!" anxiety bait. Just badges
// that mark real progress through the app's data.
import { derived } from 'svelte/store';
import { journal, milestones, books } from './collections';
import { habits, habitChecks, streakFor, checkKeys } from './habits';
import { bodyEntries } from './body';
import {
  cashflowEntries, netWorthEntries, savingsGoals, givingEntries,
  givingThisYear, givingTargetAnnual, monthKey, lastMonths,
} from './financial';
import { assessmentResults, latestAssessment } from './assessment';
import { todayAge } from './personal';
import type { Mood } from '../types';

export interface Achievement {
  id: string;
  category: 'journal' | 'habits' | 'body' | 'wealth' | 'books' | 'finance' | 'overall';
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
}

const MOOD_VALUE: Record<Exclude<Mood, ''>, number> = {
  '😞': 1, '😕': 2, '😐': 3, '🙂': 4, '😄': 5,
};

// Helpers: derive counts/streaks that several achievements share.
function journalEntryCount($journal: Record<string, unknown>): number {
  let n = 0;
  for (const v of Object.values($journal)) {
    const text = typeof v === 'string' ? v : (v as { text?: string })?.text;
    const photo = typeof v === 'string' ? '' : (v as { photo?: string })?.photo;
    if ((text && text.trim()) || photo) n++;
  }
  return n;
}

function journalLongestStreak($journal: Record<string, unknown>): number {
  const keys = Object.keys($journal).sort();
  let best = 0;
  let run = 0;
  let lastTs = -Infinity;
  for (const k of keys) {
    const v = $journal[k];
    const text = typeof v === 'string' ? v : (v as { text?: string })?.text;
    if (!text || !text.trim()) { run = 0; lastTs = -Infinity; continue; }
    const ts = new Date(k).getTime();
    if (lastTs !== -Infinity && Math.abs(ts - lastTs - 7 * 86400000) < 86400000) run++;
    else run = 1;
    if (run > best) best = run;
    lastTs = ts;
  }
  return best;
}

function bestHabitStreak($habits: { id: string; archivedAt?: number }[], $keys: Set<string>): number {
  let best = 0;
  for (const h of $habits) {
    if (h.archivedAt) continue;
    const s = streakFor(h.id, $keys);
    if (s > best) best = s;
  }
  return best;
}

function consecutiveBodyDays($entries: { date: string }[]): number {
  if ($entries.length === 0) return 0;
  // Walk back from the newest entry's date — entries are stored newest-first.
  // Use local-time YYYY-MM-DD formatting (matches utils.formatDOB) so we
  // don't drift by a day in non-UTC timezones the way toISOString() would.
  const dates = new Set($entries.map((e) => e.date));
  const localYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Parse the newest entry's date in local time to match the same idiom.
  const [y, m, day] = $entries[0].date.split('-').map(Number);
  const cur = new Date(y, m - 1, day);
  let count = 0;
  while (dates.has(localYmd(cur))) {
    count++;
    cur.setDate(cur.getDate() - 1);
    if (count > 3650) break;
  }
  return count;
}

function netWorthPeak($entries: { amount: number }[]): number {
  let peak = 0;
  for (const e of $entries) if (e.amount > peak) peak = e.amount;
  return peak;
}

// Distinct 'YYYY-MM' months with at least one cash-flow entry.
function distinctCashflowMonths($entries: { date: string }[]): number {
  const months = new Set<string>();
  for (const e of $entries) months.add(monthKey(e.date));
  return months.size;
}

// Consecutive months with entries, counting back from this month (this
// month not required yet — same grace rule as habit streaks).
function consecutiveBudgetMonths($entries: { date: string }[]): number {
  const months = new Set<string>();
  for (const e of $entries) months.add(monthKey(e.date));
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const walk = lastMonths(thisMonth, 120); // newest last
  let count = 0;
  let i = walk.length - 1;
  if (!months.has(walk[i])) i--;
  while (i >= 0 && months.has(walk[i])) { count++; i--; }
  return count;
}

function booksInCurrentAge($books: { age: number }[], age: number): number {
  return $books.filter((b) => b.age === age).length;
}

// ---- Achievement catalog ----
// 15 unlockable badges spanning every tracker. Each isUnlocked is a pure
// function over the derived state — easy to test, no side effects.

export const achievements = derived(
  [
    journal, habits, habitChecks, bodyEntries,
    cashflowEntries, savingsGoals, givingEntries, givingThisYear, givingTargetAnnual,
    milestones, books, assessmentResults, latestAssessment, todayAge,
    checkKeys,
  ],
  ([
    $journal, $habits, $habitChecks, $bodyEntries,
    $cashflowEntries, $savingsGoals, $givingEntries, $givingThisYear, $givingTargetAnnual,
    $milestones, $books, $assessmentResults, $latestAssessment, $todayAge,
    $checkKeys,
  ]): Achievement[] => {
    const entryCount = journalEntryCount($journal as Record<string, unknown>);
    const longestStreak = journalLongestStreak($journal as Record<string, unknown>);
    const bestHabit = bestHabitStreak($habits, $checkKeys);
    const bodyConsec = consecutiveBodyDays($bodyEntries);
    const budgetMonths = distinctCashflowMonths($cashflowEntries);
    const budgetRun = consecutiveBudgetMonths($cashflowEntries);
    const booksThisYear = $todayAge >= 0 ? booksInCurrentAge($books, $todayAge) : 0;
    const milestonesCompleted = $milestones.filter((m) => m.completed).length;
    const allWealths60 = $latestAssessment
      ? Object.values($latestAssessment.selfScores).every((s) => s >= 60)
      : false;
    const allWealths80 = $latestAssessment
      ? Object.values($latestAssessment.selfScores).every((s) => s >= 80)
      : false;

    return [
      // Journal
      {
        id: 'journal-first',
        category: 'journal',
        emoji: '✍️',
        title: 'First entry',
        description: 'Wrote your first journal entry.',
        unlocked: entryCount >= 1,
      },
      {
        id: 'journal-streak-4',
        category: 'journal',
        emoji: '📓',
        title: 'Month of writing',
        description: 'Journaled 4 weeks in a row.',
        unlocked: longestStreak >= 4,
      },
      {
        id: 'journal-streak-12',
        category: 'journal',
        emoji: '📚',
        title: 'Quarter held',
        description: 'Journaled 12 weeks in a row.',
        unlocked: longestStreak >= 12,
      },
      {
        id: 'journal-streak-52',
        category: 'journal',
        emoji: '🏔️',
        title: 'A year in your own words',
        description: 'Journaled 52 weeks in a row.',
        unlocked: longestStreak >= 52,
      },

      // Habits
      {
        id: 'habit-first',
        category: 'habits',
        emoji: '🌱',
        title: 'First habit checked',
        description: 'Marked any habit done for the first time.',
        unlocked: $habitChecks.length >= 1,
      },
      {
        id: 'habit-streak-30',
        category: 'habits',
        emoji: '🔥',
        title: 'Thirty in a row',
        description: 'Held a habit for 30 consecutive days.',
        unlocked: bestHabit >= 30,
      },
      {
        id: 'habit-streak-100',
        category: 'habits',
        emoji: '💎',
        title: 'Hundred-day streak',
        description: 'Held a habit for 100 consecutive days.',
        unlocked: bestHabit >= 100,
      },

      // Body
      {
        id: 'body-first',
        category: 'body',
        emoji: '🌡️',
        title: 'First check-in',
        description: 'Logged your first daily body entry.',
        unlocked: $bodyEntries.length >= 1,
      },
      {
        id: 'body-week',
        category: 'body',
        emoji: '🛌',
        title: 'Week of awareness',
        description: 'Logged a body entry 7 days in a row.',
        unlocked: bodyConsec >= 7,
      },

      // Books
      {
        id: 'books-5',
        category: 'books',
        emoji: '📖',
        title: 'Five books',
        description: 'Logged 5 books read in this age year.',
        unlocked: booksThisYear >= 5,
      },
      {
        id: 'books-25',
        category: 'books',
        emoji: '🎓',
        title: 'A real reader',
        description: 'Logged 25 books across your reading log.',
        unlocked: $books.length >= 25,
      },

      // Finance
      {
        id: 'budget-first',
        category: 'finance',
        emoji: '📒',
        title: 'First month on the books',
        description: 'Logged your first month of income or spending.',
        unlocked: budgetMonths >= 1,
      },
      {
        id: 'budget-three',
        category: 'finance',
        emoji: '📊',
        title: 'Quarter of clarity',
        description: 'Logged cash flow three months in a row.',
        unlocked: budgetRun >= 3,
      },
      {
        id: 'give-ten-percent',
        category: 'finance',
        emoji: '🤲',
        title: '10% giver',
        description: 'Reached your annual giving target of 10% of net worth.',
        unlocked: $givingTargetAnnual > 0 && $givingThisYear >= $givingTargetAnnual,
      },

      // Wealth (overall)
      {
        id: 'wealth-balanced-60',
        category: 'wealth',
        emoji: '⚖️',
        title: 'Balanced',
        description: 'All five wealths scored at least 60 on a self-assessment.',
        unlocked: allWealths60,
      },
      {
        id: 'wealth-thriving-80',
        category: 'wealth',
        emoji: '🌟',
        title: 'Thriving',
        description: 'All five wealths scored at least 80 on a self-assessment.',
        unlocked: allWealths80,
      },

      // Overall / mixed
      {
        id: 'milestone-first-done',
        category: 'overall',
        emoji: '🏁',
        title: 'First milestone done',
        description: 'Marked a milestone completed.',
        unlocked: milestonesCompleted >= 1,
      },
    ];
  },
);

// Personal-bests derived store — peaks and longest streaks across the
// trackers. Used by PersonalBestsSection.
export interface PersonalBests {
  journalEntries: number;
  journalLongestStreakWeeks: number;
  bestHabitStreakDays: number;
  bodyConsecutiveDays: number;
  netWorthPeak: number;
  givingThisYear: number;
  booksTotal: number;
  milestonesCompleted: number;
  bestMoodWeekAvg: number | null;
}

export const personalBests = derived(
  [
    journal, habits, habitChecks, bodyEntries,
    netWorthEntries, givingThisYear, books, milestones, checkKeys,
  ],
  ([
    $journal, $habits, $habitChecks, $bodyEntries,
    $netWorthEntries, $givingThisYear, $books, $milestones, $checkKeys,
  ]): PersonalBests => {
    // Best mood week = rolling 7-day average of mood values, find max.
    let bestMoodWeekAvg: number | null = null;
    const moodEntries: { ts: number; mood: number }[] = [];
    for (const [k, v] of Object.entries($journal as Record<string, unknown>)) {
      const m = typeof v === 'string' ? '' : (v as { mood?: Mood })?.mood;
      if (!m || m === '') continue;
      moodEntries.push({ ts: new Date(k).getTime(), mood: MOOD_VALUE[m as Exclude<Mood, ''>] });
    }
    moodEntries.sort((a, b) => a.ts - b.ts);
    for (let i = 0; i < moodEntries.length; i++) {
      const windowStart = moodEntries[i].ts;
      const window: number[] = [moodEntries[i].mood];
      for (let j = i + 1; j < moodEntries.length; j++) {
        if (moodEntries[j].ts - windowStart > 7 * 86400000) break;
        window.push(moodEntries[j].mood);
      }
      if (window.length < 3) continue; // need a meaningful sample
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      if (bestMoodWeekAvg === null || avg > bestMoodWeekAvg) bestMoodWeekAvg = avg;
    }

    return {
      journalEntries: journalEntryCount($journal as Record<string, unknown>),
      journalLongestStreakWeeks: journalLongestStreak($journal as Record<string, unknown>),
      bestHabitStreakDays: bestHabitStreak($habits, $checkKeys),
      bodyConsecutiveDays: consecutiveBodyDays($bodyEntries),
      netWorthPeak: netWorthPeak($netWorthEntries),
      givingThisYear: $givingThisYear,
      booksTotal: $books.length,
      milestonesCompleted: $milestones.filter((m) => m.completed).length,
      bestMoodWeekAvg,
    };
  },
);
