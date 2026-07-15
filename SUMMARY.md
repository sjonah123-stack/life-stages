# Session Summary — life-stages

Last updated: 2026-07-15 — delight features (confetti, badge toasts, Today habits strip) + full UI polish pass **deployed to prod**.

## Where prod stands

| | URL | Status |
|---|---|---|
| **Production** | https://life-stages-90806.web.app | Latest build: AI + editorial redesign + delight/polish. |
| **Legacy archive** | https://life-stages-90806.web.app/legacy.html | Old single-file app, frozen. |

Backend is deployed: 3 Cloud Functions (Node 22), Firestore + Storage rules released. The user
pushes commits via **GitHub Desktop** (the terminal here has no git auth). Tell them the pending
commit count each session: `git rev-list --count origin/main..HEAD`.

## Session 2026-07-15 — delight features + UI polish (preview-pending)

Goal: make the app one people *want* to open daily. User chose "tasteful delight" (no XP/levels/
streak-guilt), full UI polish, and habits on Today. 289 tests, 0 type errors, clean build.

1. **Confetti** — hand-rolled canvas (`lib/confetti.ts`, no dependency), palette-colored, no-op under
   `prefers-reduced-motion`. Small burst on habit check, big on milestones/badges.
2. **Toasts** — `stores/toasts.ts` (max 3, auto-expire) + `ToastHost.svelte` mounted in App.svelte.
3. **Habit celebrations** — `lib/habit-celebration.ts`: `toggleHabitWithCelebration` fires confetti
   on check only (never uncheck); streak milestones [7,30,100,365] get big confetti + toast, with a
   session-level guard against uncheck/recheck double-toasts.
4. **Achievement unlock toasts** — `stores/achievement-notifier.ts`. Device-local `achievementsSeen`
   (persistedJSON, `null` = never seeded). First emission seeds silently; unlocks during cloud
   download (`isApplyingCloud()` from cloud-sync) record silently; only genuine transitions toast.
5. **Today habits strip** — `TodayHabitsCard.svelte`, one-tap pills with streak flames + n/n tally,
   under DailyCheckInCard; hidden when no habits; "Manage →" routes to Goals.
6. **UI polish** — radius tokens (`--radius-*`); `.module-section` + `.btn` family hoisted to app.css
   (7 duplicated card blocks + 5 button blocks deleted; Finance sections renamed to module-section);
   global `:focus-visible` rings; legacy orange/pink/yellow rgba() → `color-mix` on palette vars
   (~40 sites); `color: white` → cream on warm fills; check-pop + badge-tile stagger animations;
   slide transitions on habit rows/forms (`lib/motion.ts` gates all durations on reduced-motion).

Deferred (intentional): wealth white-glass surfaces, AuthPill Google-brand hexes,
CalendarExportButton grays, broader enter/exit transition sweep beyond habits/toasts.

## Owed by the user (console only — Claude can't do these)

1. ✅ **AI Studio billing — DONE.**
2. **App Check — enforcement pending.** Secret registered, token 400s resolved. Confirm "verified"
   in App Check → APIs Metrics, then enforce for Firestore/Storage/AI Logic. **Don't enforce before
   tokens verify** or prod (incl. AI) breaks.
3. **Firestore PITR / scheduled backups** — optional; recommended.

## Design decisions (don't relitigate)

- **One editorial palette, no theme switcher.** Colours/fonts are CSS vars in `app.css`.
- **No chart library** — hand-rolled SVG radar; confetti is hand-rolled canvas for the same reason.
- **Tasteful delight, not gamification** — no XP/levels/guilt. Celebrations fire only on genuine
  user-caused transitions; achievement "seen" state is device-local by design (see notifier header).
- **Cloud sync = `users/{uid}` doc, `setDoc(merge:true)`;** persisted state flows through
  `stores/persisted.ts`; migration logic lives in each store's `setFromCloud`.
- **AI output is never trusted** (normalized) and **never in the snapshots buffer**; insights local.
- **AI runs on the Gemini Developer API, not Vertex** (`gemini-3.5-flash`; AI Studio billing).

## Known gaps / backlog

- **App Check enforcement not yet on** — AI calls unprotected from billing abuse until then.
- **Mobile polish** — audit pages at 375px (hero h1, composer-meta wrap, radar grid).
- **In-app version-restore UI** — callables deployed but not surfaced.
- **TodayWealth** renders full results inline; a collapsed summary would be nicer.
- **Deferred Blaze features** — email-send digests, BigQuery export.

## Improvement loop

`improvement-loop/` holds a scored `BACKLOG.json`, ideas inbox, and an email-digest loop (3 scheduled
tasks). See `improvement-loop/LOOP.md`. The scheduled sandbox can't build/test/deploy — that happens
in an interactive Mac session.

## Where to start each session

1. Read `CLAUDE.md` (architecture + conventions) and this file.
2. `git status` + `git rev-list --count origin/main..HEAD` for unpushed state.
3. `preview_start name="frontend-dev"` for the dev server.
4. Confirm with the user what they want *before* coding; deploy preview-channel-first for big changes.
