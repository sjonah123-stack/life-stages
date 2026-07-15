// Detects genuine achievement unlocks and celebrates them (toast + big
// confetti). The `achievements` store is purely derived, so "newly
// unlocked" needs a device-local memory of what's been seen.
//
// Why device-local (not cloud-synced): this is notification state, not
// user data. Syncing it would race across devices (device A's "seen"
// write suppressing device B's toast mid-diff) for zero user value. The
// worst case of device-local is a missed toast on a second device —
// the right failure mode for a celebration.
//
// False-positive suppression, in order:
//   1. `null` sentinel — the LS key has never been written on this
//      device. The first emission seeds every currently-unlocked id
//      WITHOUT toasting (first load with pre-existing data).
//   2. `isApplyingCloud()` — unlocks that arrive during a cloud
//      download (fresh-device sign-in) are recorded silently. The
//      derived store recomputes synchronously inside applyCloudState's
//      store.set() calls, and the flag only clears in a setTimeout(0),
//      so it's reliably true during those emissions.
// Only after both guards does an unlock toast. Ids stay in `seen` even
// if the badge later re-locks (data deleted), so re-unlocking never nags.
import { get } from 'svelte/store';
import { persistedJSON } from './persisted';
import { achievements, type Achievement } from './achievements';
import { isApplyingCloud } from './cloud-sync';
import { pushToast } from './toasts';
import { confettiFrom } from '../lib/confetti';

// null = never seeded on this device; [] = seeded, nothing unlocked yet.
export function normalizeSeen(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = new Set<string>();
  for (const v of raw) {
    if (typeof v === 'string' && v) out.add(v);
  }
  return [...out];
}

export const seenAchievementIds = persistedJSON<string[] | null>(
  'achievementsSeen',
  null,
  normalizeSeen,
);

// Pure diff — unlocked achievements not yet in `seen`.
export function diffNewlyUnlocked(
  all: Achievement[],
  seen: ReadonlySet<string>,
): Achievement[] {
  return all.filter((a) => a.unlocked && !seen.has(a.id));
}

let initialized = false;

// Called once from main.ts, after initCloudSync (so isApplyingCloud is
// wired) and before initAuth (so a sign-in download is guarded).
export function initAchievementNotifier(): void {
  if (initialized) return;
  initialized = true;

  achievements.subscribe(($all) => {
    const seen = get(seenAchievementIds);
    if (seen === null) {
      // First run on this device — seed silently, no celebration.
      seenAchievementIds.set(
        $all.filter((a) => a.unlocked).map((a) => a.id),
      );
      return;
    }

    const fresh = diffNewlyUnlocked($all, new Set(seen));
    if (fresh.length === 0) return;
    seenAchievementIds.set([...seen, ...fresh.map((a) => a.id)]);

    if (isApplyingCloud()) return; // cloud download, not a user action

    for (const a of fresh) {
      pushToast({
        kind: 'achievement',
        emoji: a.emoji,
        title: a.title,
        body: a.description,
      });
    }
    confettiFrom(null, 'big');
  });
}
