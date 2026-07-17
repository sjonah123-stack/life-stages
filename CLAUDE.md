# CLAUDE.md — life-stages

Read this first. It captures non-obvious context any future Claude session needs to be useful here.

## What this project is

A personal life dashboard for the user (Jonah, born Dec 4 2002). Single-user-per-account web app, deployed as a PWA, built around the 5 Types of Wealth framework (Sahil Bloom).

Live: **https://life-stages-90806.web.app** (Firebase Hosting)
Repo: **github.com/sjonah123-stack/life-stages**
Firebase project: `life-stages-90806`

## Stack

- **Svelte 5 + TypeScript + Vite** (the `frontend/` dir is the real app)
- **Firebase Auth + Firestore** for cross-device sync (Google sign-in)
- **vite-plugin-pwa** for service worker + manifest + offline cache
- **Vitest** (~330 tests, store/util level — see Testing conventions)
- **No backend** other than Firebase — pure static SPA (+3 small Cloud Functions)

The legacy 200KB single-file `index.html` at the repo root is preserved as a static archive served at `/legacy.html`. Don't edit it. The new app is everything under `frontend/`.

## Repository layout

```
life-stages/
├── CLAUDE.md                  ← this file
├── SUMMARY.md                 ← latest session handoff (what's done, what's pending)
├── index.html                 ← LEGACY archive, do not edit; copied to frontend/public/legacy.html at build
├── manifest.json, sw.js, icon.svg ← legacy PWA assets, no longer in serving path
├── firebase.json              ← hosting + firestore (rules/indexes) + functions config
├── firestore.rules            ← per-user lock: users/{uid} (+snapshots, +versions) by that uid
├── firestore.indexes.json     ← (empty) Firestore composite indexes
├── storage.rules              ← per-user lock on Cloud Storage (journal photos under users/{uid})
├── functions/                 ← Cloud Functions (TS): server-side versioning + restore API
│   └── src/index.ts           ← archiveUserVersion trigger, list/restoreUserVersion callables
├── .firebaserc
└── frontend/
    ├── package.json
    ├── vite.config.ts         ← PWA + manualChunks (firebase, leaflet)
    ├── public/
    │   ├── icon.svg
    │   └── legacy.html        ← legacy archive (SW registration stripped, manifest link removed)
    └── src/
        ├── App.svelte         ← router root: page slide, swipe action, tour auto-open
        ├── main.ts            ← entry: mount + initCloudSync + initAchievementNotifier + initAuth
        ├── app.css            ← editorial palette CSS vars, radius tokens, global .module-section/.btn,
        │                         focus rings, celebration keyframes, .tour-highlight
        ├── types.ts           ← every domain type
        ├── config.ts          ← LIFESPAN, FIREBASE_CONFIG, GEMINI_MODEL, LS_PREFIX, etc.
        ├── data.ts            ← STAGES ({range,name,poetic} only), COUNTRY_NOTES, RELATION_LABEL, PROMPTS
        ├── data/
        │   └── assessment.ts  ← 5-Wealths survey + recommendations
        ├── utils.ts           ← parseDOB, formatDOB, readLS/writeLS, debounce, clearAllLocalData
        ├── lib/
        │   ├── firebase.ts    ← lazy-init singleton (auth, db, App Check)
        │   ├── ai.ts          ← all Gemini features: prompts + schemas + normalizers
        │   ├── router.ts      ← PAGES, TAB_PAGES, currentPage, navigate
        │   ├── swipe.ts       ← touch page-swipe action + pure helpers
        │   ├── confetti.ts / motion.ts / habit-celebration.ts ← delight layer
        │   └── image.ts / photos.ts / ics.ts / openLibrary.ts
        ├── stores/
        │   ├── personal.ts    ← dob, sex, country, role, aspiration… (persisted, cross-tab)
        │   ├── collections.ts ← milestones, journal, letters, people, books, rituals
        │   ├── journal-helpers.ts ← getEntry/setEntry, weekKey, week math
        │   ├── financial.ts   ← budget-first: cashflowEntries, budgetPlan, savings goals,
        │   │                     giving, annualizeIncome/actualSavingsRate/savedTowardGoal
        │   ├── habits.ts / body.ts / assessment.ts / achievements.ts / anniversary.ts
        │   ├── toasts.ts / achievement-notifier.ts / tour.ts / ai.ts ← UX state (device-local)
        │   ├── derived.ts / slider.ts
        │   ├── auth.ts        ← authTransition rules, sign-in/out, syncStatus
        │   └── cloud-sync.ts  ← Firestore upload/download, debounced, guards
        └── components/
            ├── nav/           ← TopNav, AuthPill
            ├── pages/         ← Today, Journal, Goals, Finance, Progress, Settings
            ├── today/         ← AgeSlider, StatRow, TodayWealth, AnniversaryCard,
            │                     DailyCheckInCard, TodayHabitsCard
            ├── journal/       ← Composer, EntryFeed, JournalPulse, WeeksGrid,
            │                     OnThisDayBanner, MoodSparkline, AiJournalInsight
            ├── goals/         ← HabitsSection, BooksSection, CalendarExportButton, AiMilestoneSuggest
            ├── wealth/        ← AssessmentIntro/Survey/Results, WealthRadar, WealthCard
            ├── finance/       ← CashflowSection (Monthly Budget), BudgetCoach,
            │                     SavingsSection, GivingSection
            ├── progress/      ← WeeklyReflectionSection, WealthTrendsSection, BodyTrendsSection,
            │                     AchievementsSection, PersonalBestsSection, Sparkline
            └── shared/        ← PageHeader, WelcomeScreen (3-step wizard), AppTour, ToastHost,
                                  WealthIcon, FlameIcon, PlaceholderPage
```

## Critical conventions

### localStorage namespace

Everything user-facing lives under the `lifeStages.` prefix (see `LS_PREFIX` in `config.ts`). This lets `clearAllLocalData()` wipe all app state atomically on sign-out and on user-change.

**Do not write any LS key without the prefix.** Use `readLS` / `writeLS` / `readJSON` / `writeJSON` from `utils.ts`.

### Stores are the source of truth

Every persisted store in `stores/personal.ts` and `stores/collections.ts` uses a `persisted()` / `persistedJSON()` helper that:
1. Reads initial value from localStorage
2. Writes to localStorage on every `.set()` (subscription)
3. Listens for cross-tab `storage` events and updates the store, with an `applyingExternal` flag to prevent ping-pong loops

When adding a new persisted field:
- Add a writable in personal.ts or collections.ts using the helper
- Add it to `collectStateForCloud()` in `cloud-sync.ts`
- Add it to `applyCloudState()` in cloud-sync.ts
- Add it to the `subscribeAll()` array so changes auto-trigger Firestore upload

### Cross-user data isolation

The pure `authTransition(prevUid, newUid, wasInitialized)` in `stores/auth.ts` decides what the `onAuthStateChanged` listener does: a sign-in from a logged-out session (`null → user`) **loads from cloud** (never wipes — that was the data-loss bug); only a real account switch (`userA → userB`) or sign-out (`user → null`) wipes localStorage + reloads (`clearAllLocalData()` + `window.location.reload()`) for cross-account isolation. The rules are unit-tested in `auth.test.ts`. Don't reintroduce a wipe on plain sign-in.

### AI features (Firebase AI Logic / Gemini)

`lib/ai.ts` calls Gemini via Firebase AI Logic (`GoogleAIBackend` — the Gemini **Developer API**, not Vertex; `gemini-3.5-flash` only exists there and Vertex 404s on it, so billing is AI Studio pay-as-you-go), using `Schema`-typed **structured output** so responses come back as validated JSON. Model id is `GEMINI_MODEL` in `config.ts` — verify the exact string in the AI Logic console. Five features: milestone suggestions (`AiMilestoneSuggest.svelte` → Goals), journal insights (`AiJournalInsight.svelte` → Journal), reflective prompts (in `Composer.svelte`), weekly reflection (Progress), budget coach (`BudgetCoach.svelte` → Finance; sends category totals only, never notes/recipients). Conventions:
- **Never trust model output** — every result runs through a pure, tested normalizer that clamps/validates before use.
- **Ground suggestions in evidence.** Milestone suggestions feed habits/books/journal-snippets/completed goals into the prompt, require a `basedOn` grounding fact per suggestion (shown as provenance, stripped before storing), clamp ages to +1..+5 years, ban cliché goals, and run at temperature 0.7. Keep this calibration when touching prompts — thin context + default temp is what produced "ridiculous" output.
- **AI is gated to signed-in users** (billing tied to an account) and **never written to the `snapshots` backup buffer**. AI artifacts persist **locally** (`stores/ai.ts`, regenerable, keeps the user doc lean), not in Firestore.
- **App Check** (`lib/firebase.ts`) is gated on `RECAPTCHA_SITE_KEY`; empty = disabled so the app runs unprotected-but-working until the key is set. Required before exposing AI on prod (billing-abuse protection).

### Cloud sync gotchas

- `applyCloudState` sets stores during cloud download; those `.set()` calls would normally trigger the auto-upload subscription. The `applyingCloud` flag in cloud-sync.ts suppresses this. Don't remove it.
- **Empty-overwrite guard:** `saveToCloud` refuses to overwrite a populated cloud doc with an empty local payload (`isPayloadEmpty`, tested). This is the last line of defence against the data-loss class — don't weaken it.
- **Rolling snapshots:** before each non-empty overwrite, the payload is backed up to `users/{uid}/snapshots/{slot}`, round-robin over `SNAPSHOT_SLOTS` (5). `snapshotSeq` is seeded from the main doc on load. Best-effort; recoverable via the Firestore console.
- **Photos live in Cloud Storage, never the doc.** `JournalEntry.photo` holds a `data:` URL locally (offline-capable) but is uploaded to Storage (`users/{uid}/journal/{key}.jpg`, see `lib/photos.ts`) and replaced with its download URL on every `saveToCloud` (`migrateJournalPhotos`). This keeps the Firestore doc clear of the 1 MB limit. `<img src={photo}>` and `!!photo` checks work for both URL kinds, so don't special-case them. Requires Cloud Storage enabled on the project.
- **Export / import** (`exportStateAsJson` / `importStateFromJson`, Settings → Your data): a user-owned JSON backup/restore that reuses `collectStateForCloud` / `applyCloudState`. Import rejects malformed/empty files and pushes the restored state up after the `applyingCloud` flag clears.

### Field validation

`lib/validate.ts` (pure, tested) + global `.invalid`/`.field-error` in `app.css`: a non-blank
wrong value **turns the field red and disables the paired submit** until fixed or cleared; blank
is never invalid. Live-saving fields (Settings DOB/kids/sleep/longevity, Goals best/hardest year)
buffer drafts so invalid values never reach stores. Never silently drop or clamp a wrong value.

### Delight features (confetti / toasts / badge unlocks)

"Tasteful delight" only — no XP, levels, or streak-guilt. Conventions:
- **Confetti is hand-rolled canvas** (`lib/confetti.ts`, same ethos as the SVG radar — no library).
  Every celebration is a no-op under `prefers-reduced-motion`; all Svelte transition durations go
  through `lib/motion.ts → motionDuration()`.
- **Habit check-offs celebrate via `lib/habit-celebration.ts`** (used by HabitsSection + the Today
  strip): fanfare only on uncheck→check, milestones [7,30,100,365] toast once per session.
- **Achievement unlock toasts** (`stores/achievement-notifier.ts`): `achievementsSeen` is
  **device-local by design** (notification state, not user data — don't add it to CloudPayload).
  Seeding rules (null sentinel + `isApplyingCloud()` guard) prevent toast storms on first load and
  fresh-device sign-in — don't remove either guard.
- Shared UI: `stores/toasts.ts` + `ToastHost.svelte` (mounted once in App.svelte); `.module-section`
  and `.btn` are global classes in `app.css` — don't re-declare them per component.
- **Icons are hand-rolled SVG, not emoji** (Today/wealth surfaces): `shared/WealthIcon.svelte`
  (5 wealth glyphs, works inside the radar via nested `<svg x y>`) and `shared/FlameIcon.svelte`
  (streaks). User-entered emojis (habit `emoji` field, journal moods) are data — leave them.
- **Swipe navigation** (`lib/swipe.ts`): touch-only swipes move through `TAB_PAGES` (no wrap;
  Settings gear-only). Gestures starting on form controls or horizontally-scrollable elements are
  ignored — keep that guard when adding new horizontal-scroll UI. Directional slide lives in
  App.svelte (`slideDirection` + `{#key $currentPage}`).

### Hash router + app tour

Pages live in `lib/router.ts → PAGES`. New page: add to `PAGES` + `PAGE_LABELS` (+ `TAB_PAGES`
for the nav), create the component, add the branch in `App.svelte`.
The first-time tour (`shared/AppTour.svelte` + `stores/tour.ts`) walks the real pages via
`data-tour` anchor attributes on key sections — keep those attributes when refactoring
(a missing anchor degrades to scroll-to-top, not a crash). `tourSeen` is device-local;
auto-opens only on the wizard-finish transition; replayable from Settings.

## Commands

```bash
# Dev server (use Claude Preview's preview_start with name "frontend-dev")
cd frontend && npm run dev

# Type check + Svelte check
cd frontend && npx svelte-check --workspace .

# Tests (Vitest + jsdom; setup in frontend/test/setup.ts wipes LS per test)
cd frontend && npm test          # one-shot, CI-friendly
cd frontend && npm run test:watch # watch mode
cd frontend && npm run test:ui   # browser UI

# Production build (output to frontend/dist/)
cd frontend && npm run build

# Deploy preview channel (test before prod)
firebase hosting:channel:deploy <channel-name> --expires 7d

# Deploy to production
firebase deploy --only hosting
```

## Testing conventions

- **Tests are co-located with source as `*.test.ts`** (Vitest + jsdom; glob
  `src/**/*.test.ts` + `test/**/*.test.ts`).
- **Each test starts with a clean `localStorage`** (global `beforeEach` in `test/setup.ts`).
- **Initial-load migration paths** (module-import-time logic) are tested via
  `vi.resetModules()` + dynamic `import()` after seeding LS — see assessment.test.ts.
- **DST regressions are pinned** in utils.test.ts + journal-helpers.test.ts; the
  Standard→Daylight off-by-one shipped to prod once. Don't delete those tests.
- **Keep the suite fast** (~330 tests, ~3s). Component tests are deferred — store/util
  coverage gives the highest signal-to-cost here.

## Things NOT to do

- **Don't `git push` from the CLI.** The terminal in this environment has no git auth. The user pushes via GitHub Desktop. Commit via CLI is fine; pushing isn't.
- **Don't edit the legacy `index.html` at the repo root.** It's a frozen archive. New work lives in `frontend/`.
- **Don't deploy directly to prod for major changes** — preview-channel-first. The single-file refactor that broke prod taught us this.
- **Don't add a chart library** for visualizations — the radar in WealthRadar.svelte is hand-rolled SVG and that's a deliberate choice. Use it as the precedent.
- **One editorial palette, no theme switcher.** Warm cream paper (`--bg-1` #F4F0E8), charcoal ink (`--ink`), terracotta accent (`--accent` #B5654A), Cormorant Garamond serif + Hanken Grotesk sans. All colours/fonts are CSS vars in `app.css` — restyle by editing tokens, never hardcode hexes in components. The `theme` field stays in `PersonalSettings`/`CloudPayload` read-tolerant only. Don't reintroduce ThemePicker or per-theme overrides.
- **Don't bypass `LS_PREFIX`** when reading/writing localStorage.
- **Don't introduce `--no-verify` or `--force` git flags** without explicit user permission.
- **Don't commit secrets or rotate Firebase keys** unless asked. The current `FIREBASE_CONFIG` in `config.ts` is the live project; treat it as user-managed.
- **Don't reintroduce a retirement-age input.** The worldview rejects retirement-as-a-goal. `retirementAge` stays in `CloudPayload` read-tolerant only — never read or write it. A "target age" almost certainly belongs on a savings goal's `deadline` instead.
- **Don't make charitable giving's 10% target user-configurable in v1.** The annual baseline is built into `givingTargetAnnual` on purpose — it's a worldview anchor, not a preference. Re-anchored (2026-07) from net worth to **10% of annualized income** from the cash-flow log when the net-worth tracker was retired. If the user explicitly asks to override, that's fine; otherwise leave it as a default.
- **Milestones are SMART by design.** `Milestone` has `label` (Specific), `measure?` (Measurable), `age` (Time-bound), `why?` (Relevant). Achievable is a self-check, not a field. When adding new milestone UI, keep the SMART framing in the form labels — it's not just data structure, it's a teaching prompt for thinking about goals well.
- **Retired-but-read-tolerant data: rituals, letters, net-worth entries.** Their UIs were removed (2026-07) but the stores, normalizers, and cloud round-trip stay so old docs load losslessly — letters still surface on the anniversary card; the net-worth peak stays in Personal Bests. Don't delete these stores or their CloudPayload fields, and don't rebuild the UIs without asking.
- **Finance is budget-first.** `cashflowEntries` + `budgetPlan` power the Monthly Budget section; "Savings" is an expense category by design (pay-yourself-first) and feeds savings-goal progress via `savedTowardGoal`. The savings rate is computed from actuals, not self-reported (`savingsRate` store is legacy read-tolerant).

## Deploy flow recap

1. Make changes
2. `npm run build` (verify no errors)
3. `firebase hosting:channel:deploy <name>` for verification
4. Tell user the preview URL, wait for go-ahead
5. `firebase deploy --only hosting` only after they approve
6. Commit via CLI (pre-set git identity is `sjonah123 / sjonah123@gmail.com`)
7. Tell user "X commits to push via GitHub Desktop"

## Improvement loop

`improvement-loop/` is a self-running system for deciding what to build next. `BACKLOG.json`
is the scored source of truth; `IDEAS_INBOX.md` is freeform capture; `LOOP.md` documents it.
Three scheduled tasks drive it: `life-stages-improvement-loop` (weekly review), `life-stages-digest`
(every 2 days — drafts an email digest of suggestions + in-app notification), `life-stages-build-replies`
(reads your email replies and triages decisions into the backlog). A live Cowork artifact
`life-stages-backlog` renders it. **Environment limit:** the scheduled sandbox can't build/test/deploy
(no Firebase CLI, npm registry unreachable, mount blocks file deletion → git locks jam) — actual
coding + deploy happen in an interactive session on the Mac. See `improvement-loop/LOOP.md`.

## Keeping docs current (after every change)

After any meaningful change, update the docs **and keep them lean** — prune stale lines, don't
just append. Targets: `CLAUDE.md` ≲230 lines, `SUMMARY.md` ≲120, `README.md` ≲60. README is a
short human overview (not a CLAUDE.md copy — it used to be one; don't let it drift back). Bloated
docs eat the context window, which defeats their purpose.

## Where to look first

- **`SUMMARY.md` next to this file** — latest session's progress, decisions, what's pending
- **`improvement-loop/LOOP.md`** — the backlog + email loop and its environment constraints
- **`CLAUDE.md` (this file)** — durable constraints and architecture
- Project memory: `/Users/Jonahs/.claude/projects/-Users-Jonahs-Code-life-stages/memory/MEMORY.md`
  (pending console actions, environment quirks, AI-backend facts)
