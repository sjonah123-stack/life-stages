// Habit check-off with celebration — the shared orchestration used by
// both HabitsSection (Goals) and TodayHabitsCard (Today).
//
// Tasteful-delight rules: fanfare only on the unchecked→checked branch
// (never on uncheck), small confetti for an ordinary check, big confetti
// + a toast only when a streak milestone is crossed. No guilt mechanics —
// nothing here reacts to a broken streak.
import { get } from 'svelte/store';
import { checkKeys, streakFor, toggleHabitCheck } from '../stores/habits';
import { pushToast } from '../stores/toasts';
import { confettiFrom } from './confetti';

export const STREAK_MILESTONES = [7, 30, 100, 365] as const;

// The highest milestone crossed by going from `before` to `after`
// consecutive days, or null if none. A gap-jump (e.g. backfilled checks
// taking 5 → 31) celebrates only the highest milestone crossed.
export function crossedMilestone(before: number, after: number): number | null {
  let hit: number | null = null;
  for (const m of STREAK_MILESTONES) {
    if (before < m && after >= m) hit = m;
  }
  return hit;
}

// Milestones already celebrated this session (`habitId|milestone`), so an
// uncheck/re-check at the boundary doesn't toast twice. Deliberately not
// persisted — a milestone reached afresh on a later day deserves its moment.
const celebratedThisSession = new Set<string>();

export function toggleHabitWithCelebration(
  habit: { id: string; label: string },
  wasChecked: boolean,
  buttonEl: HTMLElement | null = null,
): void {
  const before = streakFor(habit.id, get(checkKeys));
  toggleHabitCheck(habit.id);
  if (wasChecked) return; // unchecking — data only, no fanfare

  const after = streakFor(habit.id, get(checkKeys));
  let milestone = crossedMilestone(before, after);
  if (milestone != null) {
    const key = `${habit.id}|${milestone}`;
    if (celebratedThisSession.has(key)) milestone = null;
    else celebratedThisSession.add(key);
  }
  if (milestone != null) {
    confettiFrom(buttonEl, 'big');
    pushToast({
      kind: 'streak',
      emoji: '🔥',
      title: `${milestone}-day streak`,
      body: habit.label,
    });
  } else {
    confettiFrom(buttonEl, 'small');
  }
}
