# Session Summary — life-stages

Last updated: 2026-06-23 — shipped the editorial redesign (preview channel) + removed the People page.

## Redesign (2026-06-23)

Re-skinned the whole app to a single editorial design language — warm cream paper, charcoal
ink, terracotta accent, Cormorant Garamond (serif) + Hanken Grotesk (sans). Implemented entirely
through the existing CSS-variable system in `app.css` (palette tokens + fonts remapped), so every
component inherited the look; signature surfaces (TopNav, PageHeader, AgeSlider number, `.glass`
cards) were hand-tuned. The 3-theme switcher was retired: ThemePicker deleted, body `theme-*`
class removed, `theme` field kept read-tolerant only. All current pages/features preserved (re-skin
only, no IA change). Fonts via Google Fonts `<link>` in `index.html`; PWA manifest colours updated.
Preview channel: **https://life-stages-90806--redesign-iwsb7yer.web.app** (expires 2026-06-30) —
awaiting approval before prod.

## Where things stand right now

| | URL | Status |
|---|---|---|
| **Production** | https://life-stages-90806.web.app | Last deployed 2026-05-07. **Prod is behind `main`** — see below. |
| **Legacy archive** | https://life-stages-90806.web.app/legacy.html | Old single-file app, viewable but not maintained |

**Prod is behind source.** `main` has shipped (committed, not yet deployed) since the 2026-05-07
prod build: the net-worth tracker (`stores/financial.ts` + `components/finance/*` + tests), broad
store test coverage (11 `*.test.ts` files), and a "Modernize Today page (glass + gradient)" pass
(2026-05-11) that made the hero h1 responsive via `clamp(34px, 8vw, 64px)`. **Next deploy ships all
of this.** Run `cd frontend && npm run build && cd .. && firebase deploy --only hosting`.

**Improvement loop (new 2026-06-23).** `improvement-loop/` now holds a scored `BACKLOG.json`, an
ideas inbox, and an email-digest loop (3 scheduled tasks) + a live `life-stages-backlog` dashboard.
See `improvement-loop/LOOP.md`. The old "three next directions" (net-worth, mobile, tests) are all
**done in source**; the modern redesign and the People-page removal are now **done** too. Current
open items: TodayWealth collapsed-summary state, auth user-change test.

## Pending git state

As of last check, `origin/main` is up to date with local `main` (the user pushes via GitHub Desktop). Most recent commits:
- `03ba00e` Working to continue building out wealth tab (the refactor below)
- `f5936e8` Update SUMMARY.md
- `ca62823` Add CLAUDE.md + SUMMARY.md handoff docs

Confirm any time:

```bash
cd /Users/Jonahs/Code/life-stages && git status && git rev-list --count origin/main..HEAD
```

**Reminder:** the terminal here cannot push to GitHub (no auth). When work resumes and we make commits, the user pushes via GitHub Desktop. Tell them clearly each session how many commits are pending.

## Recent work (chronological)

### 1. Svelte rewrite — 15 phases, fully shipped

Migrated the original 200KB inline-script `index.html` to a Vite + Svelte 5 + TypeScript project under `frontend/`. Phases shipped in this order, each with a preview-and-verify gate:

1. **Setup** — `npm create vite@latest frontend -- --template svelte-ts`
2. **Routing skeleton** — hash router + 7 placeholder pages + top nav
3. **Foundation modules** — `types.ts`, `config.ts`, `data.ts`, `utils.ts`
4. **Stores** — `stores/personal.ts` and `stores/collections.ts` with `persisted()`/`persistedJSON()` helpers (auto-LS + cross-tab `storage` events with `applyingExternal` guard)
5. **Welcome screen + theme picker** — first store-backed UI
6. **Settings page**
7. **Today page** — slider, age display, dimension cards, stat row, texture panel, good news
8. **Journal composer + entry feed**
9. **Journal calendar grid + pulse banner + future-self letters** — 4,680-square weeks grid, streak counter, anniversary card
10. **People CRM + Rituals**
11. **Places + Leaflet map**
12. **Reading + Goals**
13. **Firebase Auth + Firestore cloud sync** — `lib/firebase.ts`, `stores/auth.ts`, `stores/cloud-sync.ts`
14. **PWA + bundle code-splitting** — `vite-plugin-pwa` with `manualChunks` separating firebase + leaflet
15. **Cutover** — preview channel verified, `firebase deploy --only hosting` flipped prod

Mid-rewrite polish pass before phase 9 added: composer auto-save 30s max-wait, date min-clamp on the composer, cross-tab sync, `<PageHeader />` extraction.

Tagged the milestone as `svelte-v1`.

### 2. 5 Types of Wealth assessment — shipped to prod 2026-05-07

Built a survey-driven assessment using Sahil Bloom's framework. Three states based on whether the user has taken the assessment:

- **Intro** — 5 wealth tiles + "Take the 3-minute assessment" CTA
- **Survey** — 15 questions (3 per wealth), one-at-a-time, Likert 1–5, progress bar, prev/next
- **Results** — radar chart + 5 wealth cards + top-2 growth callout + per-result controls

Scoring is **blended**:
- **Self-report** comes from survey answers (0–100 per wealth)
- **Behavioral** comes from a derived store reading existing app data (people count, journal streak, lifestyle inputs filled, etc.) — recomputes live, never stored
- Both shown side-by-side; gap is the insight

Recommendations surface when either score < 60. Each rec is a deep-link to an existing tool (`/people`, `/journal`, `/settings`, etc.).

### 4. Codebase cleanup pass — shipped to prod 2026-05-07

A no-feature-change refactor pass to set up groundwork for future buildout. Driven by a three-way parallel review (reuse / quality / efficiency agents) of the wealth refactor, scoped to the highest-leverage findings.

**Foundation:**
- New `frontend/src/stores/persisted.ts` — single source of truth for the LS-write + cross-tab-sync + ping-pong-guard pattern. Two helpers: `persisted<T>(key, initial, parse, serialize)` for string-encoded values and `persistedJSON<T>(key, initial, normalize?)` for JSON values. The optional `normalize` hook is what `assessmentResults` uses to migrate v1 single-result LS into the v2 list shape on first load.
- Replaces 4 hand-rolled copies that previously lived in `personal.ts`, `collections.ts` (`persistedJSON` + `persistedNumber`), and `assessment.ts` (`persistedResults`). Adding new persisted state is now a one-liner.
- `cloud-sync.ts` no longer knows the v1/v2 wealth schema. It calls `setAssessmentFromCloud(cloud)` and the store decides which key to read. Same `normalizeList` sanitizer feeds both LS-load and cloud-load paths — single funnel.

**Type tightening:**
- `RECOMMENDATIONS` is now `as const satisfies Record<WealthKey, readonly Recommendation[]>` and `RecommendationId = (typeof RECOMMENDATIONS)[WealthKey][number]['id']` is auto-derived. `toggleRecommendation` and `WealthCard.onToggleRec` now demand a real ID — typos caught at compile time. Adding/renaming a recommendation propagates type errors to every consumer.

**Wealth-area smoothing:**
- `AssessmentResults`: `selectedId` + the keep-it-valid reactive block + `current = list.find(...)` collapsed. Now uses `latestAssessment` derived store as the default, with a user-override `pickedId` only when the dropdown is touched. Two `as` casts removed.
- `WealthCard`: confirmed via in-browser test that the keyed `{#each ... (r.id)}` + `{@const done = ...}` was the actual reactivity fix. The `$: doneMap = …` aliasing was redundant and is gone.
- `AssessmentSurvey`: `onCancel` + `onComplete` collapsed to single `onClose` (both meant "leave survey").
- `TodayWealth`: dropped duplicate h2/lede (intro and results each provide their own header), kept just the eyebrow as a section delimiter. State derivation flattened with `satisfies State`.

**Verified:** svelte-check 0 errors, build clean, bundle 161.20 KB (-1 KB vs pre-cleanup), in-browser preview confirmed all 4 reactivity attributes flip together on rec toggle, wealth result migrated cleanly.

### 3. Wealth-on-Today refactor — shipped to prod 2026-05-07 (commit `03ba00e`)

Three changes shipped together:

1. **Assessment moved off its own tab onto the Today page.** The Wealth tab is gone from TopNav; new `components/today/TodayWealth.svelte` wraps the intro→survey→results state machine and lives at the bottom of Today. `components/pages/Wealth.svelte` deleted. Old `#/wealth` URLs fall through to Today via `pageFromHash`'s default.
2. **Saved-result list with per-result delete/retake.** `assessmentResult` (single writable) → `assessmentResults` (list, newest first). "Take again" creates a new entry; "Delete" removes a specific result with confirm. When 2+ results exist, a date-picker dropdown appears in the results header to switch between them.
3. **Recommendation check-off.** Each `Recommendation` got a stable `id`. Each saved result has a `completedRecommendations: Record<recId, ISO-date>` map. Clicking a rec's checkbox toggles completion; persisted in LS + Firestore; visualised as strikethrough text + filled orange check.

**Migration path** lifts v1 single-result data into the v2 list shape automatically:
- `stores/assessment.ts → migrateLegacyLocal()` reads `lifeStages.assessment`, wraps it as one entry, writes to `lifeStages.assessmentResults`, deletes the old key.
- `stores/cloud-sync.ts → applyCloudState()` falls back to `cloud.assessmentResult` when `cloud.assessmentResults` is absent.
- `normalizeResults()` in `assessment.ts` is the single funnel that fills in missing `id` / `completedRecommendations` and sorts newest-first. Keep using it for any inbound list.

**Subtle Svelte 5 gotcha caught in verification:** template expressions like `aria-pressed={isDone(r.id)}` calling a plain function don't reliably re-evaluate when the function reads a prop — Svelte's dependency tracker doesn't see through the call. Symptom was `class:checked` updating mid-session while sibling `aria-pressed` stayed stale. **Fix:** keyed `{#each recs as r (r.id)}` with `{@const done = !!completedRecommendations[r.id]}` inside the iteration scope. (Initial diagnosis added a `$: doneMap = completedRecommendations` aliasing line as part of the fix; the cleanup pass confirmed via direct test that the alias is unnecessary — the keyed-each + `@const` is sufficient.) If you add new wealth-card UI that depends on `completedRecommendations`, follow the same pattern.

Files touched (see commit `03ba00e`): `types.ts`, `data/assessment.ts`, `stores/assessment.ts`, `stores/cloud-sync.ts`, `lib/router.ts`, `App.svelte`, `components/pages/Today.svelte`, `components/today/TodayWealth.svelte` (new), `components/wealth/AssessmentResults.svelte`, `AssessmentSurvey.svelte`, `WealthCard.svelte`. Deleted: `components/pages/Wealth.svelte`.

Verification done: svelte-check 0 errors, build success, in-browser preview confirmed migration (legacy LS key removed, new list populated with UUID + empty completedRecommendations), check-off click → persists in LS with timestamp → reload → state hydrates correctly.

## Confirmed design decisions (don't relitigate)

- **Path 1 (vanilla JS modules) failed** earlier in the session and was reverted. Going to Path 3 (full Svelte rewrite) was the right call.
- **Blended scoring** for the Wealth assessment: survey + behavioral, side-by-side.
- **Wealth lives on Today, not its own tab.** The 5-Wealths assessment is a Today section; "wealth-the-bigger-feature" (when it ships) gets reorganised then, not sooner.
- **Financial gap launches as-is**, with a "Net-worth tracking coming soon" note. Don't block the assessment on building net-worth features.
- **Survey length: 15 questions, 3 per wealth**, ~3 min.
- **Result history IS in v2** — list shape, newest first. Per-result delete + retake. Date-picker switches between saved results.
- **Recommendation completion is per-result**, not global. The same rec can be checked off on result A and unchecked on result B — they're independent. Reasoning: each saved result is a snapshot of "where I was on date X and what I committed to doing about it"; completion belongs to that snapshot.
- **No chart library** — the radar is hand-rolled SVG. Set the precedent.
- **Cloud sync uses `users/{uid}` doc with `setDoc(merge: true)`**. Don't switch to per-collection.
- **All persisted state flows through `stores/persisted.ts`.** New persisted writables use `persistedJSON()` (or `persisted()` for string-encoded values). Don't hand-roll the LS-write + cross-tab-sync + applyingExternal-guard pattern again — extending the helper is always cheaper than copying it.
- **Migration logic lives in the store, not in cloud-sync.** `cloud-sync.ts` is a router; schema-version handling for any given store is the store's job (see `assessmentResults`'s `setFromCloud` for the pattern). When you bump a store's schema, add a `setFromCloud` and a `loadInitial` normalizer; don't add another branch in cloud-sync.
- **Recommendation IDs are typed (`RecommendationId`).** Adding a new entry to `RECOMMENDATIONS` automatically widens the union. Don't pass plain `string` for rec IDs anywhere new — let the type catch typos.

## Known gaps / not done (real backlog)

- **Net-worth tracker** — Financial Wealth's behavioral score is thin (only retirement age + career field). Adding monthly check-ins, savings rate, financial goals would make Financial real. Highest-leverage next feature.
- **Mobile responsiveness** — at 375px the Today hero h1 (48px) and the new Wealth section's h2 collide; composer-meta wraps awkwardly; the wealth radar grid is tight.
- **Tests** — zero coverage. The wealth migration path (v1 → v2) and `toggleRecommendation` semantics are now non-trivial and would benefit from Vitest store round-trip tests.
- **Bundle size** — 663 KB total / ~210 KB gzip with the wealth refactor. Code-split into firebase + leaflet + main; could lazy-load via dynamic import for further wins.
- **A few `any` casts** in `DimensionCards.svelte` (partnership narrowing). Would benefit from refactor.
- **Periodic nudges** ("It's been 30 days since your assessment") — would need email/push delivery channel.
- **Public/comparison views** — comparing scores with friends or population averages.
- **Auth user-change reload-and-wipe path** — coded in `stores/auth.ts` but never tested with two real Google accounts on one device.
- **TodayWealth UX polish** — the section currently renders the full intro/survey/results inline. If a user has a saved result, they see the full results view immediately on Today (radar + 5 cards + checklist). For a multi-result world this might want a collapsed "summary card" state with an "expand" affordance.

## Likely next conversations

If the user opens with one of these, the path is roughly:

| User says | Do this |
|---|---|
| "Build the net-worth tracker" | Plan-mode this. New store (`stores/financial.ts`) for monthly net-worth check-ins + savings rate + at least one savings goal. Extend Financial behavioral scoring in `stores/assessment.ts` to read these. New UI: probably a sub-section of TodayWealth or a small `Financial.svelte` page reachable from the Financial wealth card's CTA. |
| "Add tests" | Install vitest + @testing-library/svelte. First test: `stores/assessment.ts` round-trip — write list, read back, run `toggleRecommendation`, verify state. Second: `normalizeResults()` migration paths (v1 single-result, malformed entries, empty input). Third: composer save-flow. |
| "Mobile is bad" | Audit each page at 375px width via Claude Preview, fix layout/typography per page. Known touchpoints: Today's hero h1 (48px is too big at 375), composer-meta row wrap, wealth radar grid `minmax(280px, 1fr)` is tight. |
| "Polish the wealth section on Today" | Probably means: collapsed/summary state when a result exists (don't render the whole radar+cards inline), with an "expand" affordance. New: a `TodayWealthSummary.svelte` companion. |
| "Something's wrong with the wealth flow" | Open the live URL via Claude Preview, reproduce, fix in `frontend/src/components/wealth/`, `components/today/TodayWealth.svelte`, or `stores/assessment.ts`. Redeploy preview channel for verification before flipping prod. |

## Where to start each new session

1. Read `CLAUDE.md` (architecture + conventions)
2. Read this `SUMMARY.md` (state + open threads)
3. `git status` and `git rev-list --count origin/main..HEAD` to see how much is unpushed
4. Use Claude Preview to spin up the dev server (`preview_start name="life-stages"`)
5. Confirm with the user what they want to do *before* coding
