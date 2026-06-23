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
- **No tests yet** (zero coverage; documented as known gap)
- **No backend** other than Firebase — pure static SPA

The legacy 200KB single-file `index.html` at the repo root is preserved as a static archive served at `/legacy.html`. Don't edit it. The new app is everything under `frontend/`.

## Repository layout

```
life-stages/
├── CLAUDE.md                  ← this file
├── SUMMARY.md                 ← latest session handoff (what's done, what's pending)
├── index.html                 ← LEGACY archive, do not edit; copied to frontend/public/legacy.html at build
├── manifest.json, sw.js, icon.svg ← legacy PWA assets, no longer in serving path
├── firebase.json              ← points hosting.public at frontend/dist
├── .firebaserc
└── frontend/
    ├── package.json
    ├── vite.config.ts         ← PWA + manualChunks (firebase, leaflet)
    ├── public/
    │   ├── icon.svg
    │   └── legacy.html        ← legacy archive (SW registration stripped, manifest link removed)
    └── src/
        ├── App.svelte         ← router root (hash-based)
        ├── main.ts            ← entry: mount + initCloudSync + initAuth
        ├── app.css            ← global theme variables (sunrise/ocean/forest) + .page animation
        ├── types.ts           ← every domain type
        ├── config.ts          ← LIFESPAN, FIREBASE_CONFIG, MOOD_OPTIONS, LS_PREFIX, etc.
        ├── data.ts            ← STAGES, CAREER_FIELDS, COUNTRY_NOTES, PARTNERSHIP_NOTES, RELATION_LABEL, PROMPTS
        ├── data/
        │   └── assessment.ts  ← 5-Wealths survey + recommendations
        ├── utils.ts           ← parseDOB, formatDOB, escapeHtml, readLS/writeLS, debounce, clearAllLocalData
        ├── lib/
        │   ├── firebase.ts    ← lazy-init singleton, exposes auth + db
        │   ├── image.ts       ← canvas resize → JPEG 0.82 base64
        │   └── router.ts      ← PAGES, TAB_PAGES, currentPage store
        ├── stores/
        │   ├── personal.ts    ← dob, sex, theme, country, etc. (persisted, cross-tab synced)
        │   ├── collections.ts ← milestones, journal, letters, people, books, rituals
        │   ├── journal-helpers.ts  ← getEntry/setEntry, weekKey, weekStartDate, ageAtWeek
        │   ├── derived.ts     ← currentStage, personalHorizon
        │   ├── slider.ts      ← selectedAge for the Today page
        │   ├── assessment.ts  ← 5-Wealths persisted result + behavioralScores derived
        │   ├── financial.ts   ← net-worth, savings, giving (powers the Finance page)
        │   ├── habits.ts      ← daily-cadence habits + check log (powers HabitsSection)
        │   ├── body.ts        ← daily body log: weight/sleep/workoutMinutes (DailyCheckInCard)
        │   ├── anniversary.ts ← birthday-window detection + year-in-review derived
        │   ├── achievements.ts← derived badge state + personalBests rollups
        │   ├── auth.ts        ← Firebase auth wiring, sign-in/sign-out, syncStatus
        │   └── cloud-sync.ts  ← Firestore upload/download, debounced
        └── components/
            ├── nav/           ← TopNav.svelte, AuthPill.svelte
            ├── pages/         ← Today, Journal, People, Goals, Finance, Progress, Settings
            ├── today/         ← AgeSlider, DimensionCards, GoodNews, StatRow, TexturePanel, TodayWealth,
            │                     AnniversaryCard, DailyCheckInCard
            ├── journal/       ← Composer, EntryFeed, JournalPulse, WeeksGrid, FutureLetters,
            │                     OnThisDayBanner, MoodSparkline
            ├── people/        ← PeopleSection, PersonRow
            ├── goals/         ← BooksSection, RitualsSection, HabitsSection
            ├── wealth/        ← AssessmentIntro, AssessmentSurvey, AssessmentResults, WealthRadar, WealthCard
            ├── finance/       ← NetWorthSection, SavingsSection, GivingSection, NetWorthSparkline
            ├── progress/      ← BodyTrendsSection, AchievementsSection, PersonalBestsSection, Sparkline
            └── shared/        ← PageHeader, PlaceholderPage, WelcomeScreen, ThemePicker
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

Sign-out and auth-user-change BOTH wipe localStorage and reload (`clearAllLocalData()` + `window.location.reload()`). This is in `stores/auth.ts → onAuthStateChanged` listener with an `authInitialized` flag to distinguish initial fire from later changes. Never bypass this.

### Cloud sync gotcha

`applyCloudState` sets stores during cloud download; those `.set()` calls would normally trigger the auto-upload subscription. The `applyingCloud` flag in cloud-sync.ts suppresses this. Don't remove it.

### Hash router

Pages live in `lib/router.ts → PAGES`. Adding a new page:
1. Add to `PAGES` array
2. Add to `PAGE_LABELS`
3. Add to `TAB_PAGES` if it should show in the top nav
4. Create the page component in `components/pages/`
5. Add it to the routing branch in `App.svelte`

## Commands

```bash
# Dev server (use Claude Preview's preview_start with name "life-stages")
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

- **Tests are co-located with source as `*.test.ts`.** `src/utils.test.ts`,
  `src/stores/assessment.test.ts`, etc. Vitest's include glob is
  `src/**/*.test.ts` and `test/**/*.test.ts`.
- **Each test starts with a clean `localStorage`** (wiped by
  `test/setup.ts`'s global `beforeEach`). Persisted-store tests don't
  bleed into each other.
- **Initial-load migration paths** (where module-import-time logic runs
  once) are tested by `vi.resetModules()` + dynamic `import()` after
  seeding LS. See `src/stores/assessment.test.ts` "initial-load
  migration from legacy LS key" for the pattern.
- **DST regressions are pinned** in `src/utils.test.ts` and
  `src/stores/journal-helpers.test.ts`. The Standard→Daylight off-by-one
  bug shipped to prod once; the test for `daysBetween(Dec 4 2002, May 6
  2026) === 8554` exists to keep it from coming back.
- **Keep the suite fast.** Currently runs in ~1s. Component tests using
  `@testing-library/svelte` are deferred for now — store and util
  coverage gives the highest signal-to-cost ratio for this codebase.

## Things NOT to do

- **Don't `git push` from the CLI.** The terminal in this environment has no git auth. The user pushes via GitHub Desktop. Commit via CLI is fine; pushing isn't.
- **Don't edit the legacy `index.html` at the repo root.** It's a frozen archive. New work lives in `frontend/`.
- **Don't deploy directly to prod for major changes** — preview-channel-first. The single-file refactor that broke prod taught us this.
- **Don't add a chart library** for visualizations — the radar in WealthRadar.svelte is hand-rolled SVG and that's a deliberate choice. Use it as the precedent.
- **Don't bypass `LS_PREFIX`** when reading/writing localStorage.
- **Don't introduce `--no-verify` or `--force` git flags** without explicit user permission.
- **Don't commit secrets or rotate Firebase keys** unless asked. The current `FIREBASE_CONFIG` in `config.ts` is the live project; treat it as user-managed.
- **Don't reintroduce a retirement-age input.** The user's worldview rejects retirement-as-a-goal; the app doesn't track it. `retirementAge` was removed from `PersonalSettings`, the personal store, the Settings UI, and Financial Wealth's behavioral scoring. The field stays in `CloudPayload` as optional/read-tolerant only so old user docs load without error — never read or write it. If a future feature seems to want a "target age," it almost certainly belongs on a savings goal's `deadline` instead.
- **Don't make charitable giving's 10% target user-configurable in v1.** The 10%-of-net-worth annual baseline is built into `givingTargetAnnual` on purpose — it's a worldview anchor, not a preference. If the user explicitly asks to override, that's fine; otherwise leave it as a default.
- **Milestones are SMART by design.** `Milestone` has `label` (Specific), `measure?` (Measurable), `age` (Time-bound), `why?` (Relevant). Achievable is a self-check, not a field. When adding new milestone UI, keep the SMART framing in the form labels — it's not just data structure, it's a teaching prompt for thinking about goals well.
- **Rituals live under Goals, not People.** `RitualsSection` was moved from `components/people/` to `components/goals/` when the user consolidated the page structure. `Ritual.nextDate` is optional; the "Done" button rolls it forward by `floor(365 / frequency)` days. Calendar-aware recurrence (e.g., 4th Thursday of November) is intentionally NOT implemented — too much complexity for the value; user can edit the date manually.

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
- The plan file: `/Users/Jonahs/.claude/plans/let-s-do-a-b-and-ancient-lobster.md` (latest plan; gets overwritten when a new plan-mode session runs)
- User memory: `/Users/Jonahs/.claude/projects/-Users-Jonahs-Code/memory/MEMORY.md` (birthdate Dec 4 2002, 90-year framing preference, declined name personalization)
