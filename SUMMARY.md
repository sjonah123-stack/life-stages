# Session Summary — life-stages

Last updated: 2026-07-16 — everything through the app-icon fix + first-time tour is **live on
prod** (the icon deploy carried budget-first Finance along with it).

## Where prod stands

| | URL | Status |
|---|---|---|
| **Production** | https://life-stages-90806.web.app | Latest build: AI + editorial redesign + delight/polish. |
| **Legacy archive** | https://life-stages-90806.web.app/legacy.html | Old single-file app, frozen. |

Backend is deployed: 3 Cloud Functions (Node 22), Firestore + Storage rules released. The user
pushes commits via **GitHub Desktop** (the terminal here has no git auth). Tell them the pending
commit count each session: `git rev-list --count origin/main..HEAD`.

## Session 2026-07-16 — app icon fix + first-time tour (deployed to prod)

1. **PWA icon fixed** — the user's new icon.svg was committed at the legacy root path; copied to
   `frontend/public/`, plus generated `apple-touch-icon.png`/`icon-192`/`icon-512` (iOS ignores
   SVG manifest icons entirely). Re-add to home screen to see it. Note: this deploy also took the
   budget-first work to prod.
2. **First-time app tour (guided walkthrough)** — `stores/tour.ts` + `shared/AppTour.svelte`:
   a bottom-docked coach card that *navigates the real pages* — 9 stops (Today ×3 incl. a full
   wealth-assessment explainer, Journal, Goals ×2, Finance ×2, Progress + swipe tip) — scrolling
   to and ringing each section via `data-tour` anchors (missing anchor degrades to scroll-top).
   An invisible shield keeps steps in sync. Auto-opens once on the blank→initialized transition;
   `tourSeen` device-local; replayable from Settings; arrows/Esc. Gotcha: the coach centers via
   auto margins, not transform (svelte fly overrides inline transforms). 326 tests, checks clean.

## Session 2026-07-15 — budget-first Finance + rituals removed (deployed to prod)

1. **Rituals retired** — RitualsSection deleted; `rituals` store/cloud round-trip stays
   read-tolerant; `ritual-first` badge removed; .ics export passes `rituals: []`.
2. **Net worth retired** — NetWorthSection + sparkline deleted; data read-tolerant; peak stays
   in Personal Bests. **Giving target re-anchored to 10% of annualized income** (`annualizeIncome`
   from the cash-flow log). Savings rate now computed from actuals (`actualSavingsRate`, trailing
   3 months); savings-goal progress = Savings-category logs since goal creation (`savedTowardGoal`).
   Financial behavioral scoring re-anchored to budgeting activity; nw badges → `budget-first`/
   `budget-three`.
3. **Monthly Budget** — `BudgetPlan` (expected income + per-category targets, persisted +
   cloud-synced); CashflowSection is now budget-vs-actual: per-category bars turn terracotta→red
   when over, income-vs-expected + left-to-spend header, "Savings" is a first-class category.
4. **AI budget coach** (`BudgetCoach.svelte` in the budget section) — `adviseOnBudget` sends
   month summaries + category totals only (never notes/recipients); returns observations,
   per-category recommendations, and a suggested plan with one-tap "Use as my budget". Unlocks
   once a prior month has data; signed-in only; cached locally (`latestBudgetAdvice`).
   320 tests, 0 type errors, clean build.

## Session 2026-07-15 (earlier) — Journal reorg + Goals emoji + cash-flow (in same preview)

1. **Journal reorganized** — FutureLetters UI removed (the `letters` store/normalizer/cloud
   round-trip stay so old letters still surface on the anniversary card + feed Mental Wealth);
   `letterHorizonsForAge`/`MAX_LETTER_AGE` pruned. Composer now first; JournalPulse slimmed to a
   compact stat-pill strip (streak/best/entries/words + mood sparkline) and its redundant
   "years ago" card dropped (OnThisDayBanner in the composer covers it).
2. **Goals** — wealth-tag pills now carry WealthIcon; select options de-emoji'd; milestones
   gained an optional `emoji` field (form + display, mirrors Habit.emoji; no normalizer needed);
   stray 📋✨💪 removed.
3. **Cash-flow tracker (Finance)** — new `CashflowEntry` model (`cashflowEntries` persisted +
   cloud-synced; curated CASHFLOW_CATEGORIES, giving deliberately excluded — it has its own
   tracker). `CashflowSection` between Net worth and Savings: monthly net headline, 6-month
   in/out bar chart (hand-rolled), category breakdown bars, income/expense segmented form,
   this-month entry list. Pure helpers (`summarizeMonth`, `expensesByCategory`, `lastMonths`)
   unit-tested. 304 tests, 0 type errors, clean build.

## Session 2026-07-15 (earlier) — Today de-bloat + icons + swipe (in same preview)

1. **Today decluttered** — removed TexturePanel ("what's still ahead"), GoodNews, and
   DimensionCards; page is now hero → anniversary → slider+stats → check-in → habits → wealth.
   Pruned the now-dead data: CAREER_FIELDS, PARTNERSHIP_NOTES, getCareerCallout, and all
   per-stage dimension prose/goodNews (Stage is now just {range, name, poetic}).
2. **Professional icons** — new hand-rolled `WealthIcon` (5 line glyphs, also embedded in the
   radar) + `FlameIcon` replace ⏳🤝🧠💪💰/🔥/🎉; mood faces on the anniversary card became
   "x.x/5 avg mood"; `emoji` field removed from WEALTHS. User-entered emojis untouched.
3. **Swipe navigation** — `lib/swipe.ts` (touch-only, threshold + ignore-zones for the age
   slider/nav strip/habit chain, no wrap) + directional slide transition in App.svelte.
   301 tests (12 new), 0 type errors, clean build.

## Session 2026-07-15 — delight features + UI polish (deployed to prod)

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
