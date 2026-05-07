# Session Summary — life-stages

Last updated: end of session containing the Svelte rewrite + 5 Wealths assessment build.

## Where things stand right now

| | URL | Status |
|---|---|---|
| **Production** | https://life-stages-90806.web.app | Svelte v1 (no Wealth feature yet) |
| **Wealth preview** | https://life-stages-90806--wealth-preview-t403dfvx.web.app | Has the new Wealth tab; expires ~2026-05-14 |
| **Legacy archive** | https://life-stages-90806.web.app/legacy.html | Old single-file app, viewable but not maintained |

**Open thread:** the user needs to test the wealth preview URL and decide whether to ship to prod. The next session likely starts with either "ship the wealth tab" (run `firebase deploy --only hosting`) or "fix this thing in the wealth flow."

## Pending git state (read before doing anything)

15+ commits sit on local `main` that haven't been pushed to `origin/main`. **The terminal here cannot push to GitHub** (no auth). The user pushes via GitHub Desktop.

```bash
# Confirm the gap any time:
cd /Users/Jonahs/Code/life-stages && git rev-list --count origin/main..HEAD
```

The user has been doing one-click "Push origin" via Desktop after we commit via CLI. Tell them clearly each session how many commits are pending.

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

### 2. 5 Types of Wealth assessment — committed, on preview, not on prod

Built the 7th nav tab "Wealth" hosting a survey-driven assessment using Sahil Bloom's framework. Three states based on whether the user has taken the assessment:

- **Intro** — 5 wealth tiles + "Take the 3-minute assessment" CTA
- **Survey** — 15 questions (3 per wealth), one-at-a-time, Likert 1–5, progress bar, prev/next
- **Results** — radar chart + 5 wealth cards + top-2 growth callout + retake button

Scoring is **blended**:
- **Self-report** comes from survey answers (0–100 per wealth)
- **Behavioral** comes from a derived store reading existing app data (people count, journal streak, lifestyle inputs filled, etc.) — recomputes live, never stored
- Both shown side-by-side; gap is the insight

Recommendations surface when either score < 60. Each rec is a deep-link to an existing tool (`/people`, `/journal`, `/settings`, etc.).

Files added (see `CLAUDE.md` for full layout):
- `frontend/src/data/assessment.ts` — 15 questions + 5 wealth metas + recommendation library + `computeSelfScores`
- `frontend/src/stores/assessment.ts` — `assessmentResult` writable + `behavioralScores` derived
- `frontend/src/components/wealth/` — `AssessmentIntro`, `AssessmentSurvey`, `AssessmentResults`, `WealthRadar` (hand-rolled SVG), `WealthCard`
- `frontend/src/components/pages/Wealth.svelte`
- `frontend/src/types.ts`, `lib/router.ts`, `App.svelte`, `stores/cloud-sync.ts` all extended

Verification done: svelte-check 0 errors, build success, DOM-query confirmed radar SVG with 2 polygons + 5 wealth cards + 2 focus items + retake button.

## Confirmed design decisions (don't relitigate)

- **Path 1 (vanilla JS modules) failed** earlier in the session and was reverted. Going to Path 3 (full Svelte rewrite) was the right call.
- **Blended scoring** for the Wealth assessment: survey + behavioral, side-by-side.
- **Layered nav**, not restructured: keep 7 visible tabs, the 5-Wealths framework colors recommendations and the radar but doesn't reorganize the page hierarchy.
- **Financial gap launches as-is**, with a "Net-worth tracking coming soon" note. Don't block the assessment on building net-worth features.
- **Survey length: 15 questions, 3 per wealth**, ~3 min.
- **Result history NOT in v1** — only the latest result is stored. v2 if it earns its way.
- **No chart library** — the radar is hand-rolled SVG. Set the precedent.
- **Cloud sync uses `users/{uid}` doc with `setDoc(merge: true)`**. Don't switch to per-collection.

## Known gaps / not done (real backlog)

- **Net-worth tracker** — Financial Wealth's behavioral score is thin (only retirement age + career field). Adding monthly check-ins, savings rate, financial goals would make Financial real.
- **Result history** — currently only the latest assessment is kept. v2 stores an array, shows trajectory.
- **Mobile responsiveness** — narrow viewports show some text wrapping awkwardly (we saw it in Claude Preview screenshots). Polish pass deferred to whenever you commit to mobile-first.
- **Tests** — zero coverage. Adding Vitest + Svelte Testing Library would be valuable; smoke tests for store load/save round-trips and one composer test would cover the high-risk paths.
- **Bundle size** — 632 KB total / 199 KB gzip. Code-split into firebase + leaflet + main; could lazy-load via dynamic import for further wins.
- **A few `any` casts** in `DimensionCards.svelte` (partnership narrowing). Would benefit from refactor.
- **TopNav 7 tabs may overflow on narrow screens** — already has `overflow-x: auto` but could use a more graceful collapse.
- **Periodic nudges** ("It's been 30 days since your assessment") — would need email/push delivery channel.
- **Public/comparison views** — comparing scores with friends or population averages.
- **Auth user-change reload-and-wipe path** — coded in `stores/auth.ts` but never tested with two real Google accounts on one device.

## Likely next conversations

If the user opens with one of these, the path is roughly:

| User says | Do this |
|---|---|
| "Ship the wealth tab to prod" | `firebase deploy --only hosting` from `life-stages/`, verify with curl, tell them to push via GitHub Desktop |
| "Something's wrong with the wealth tab" | Open the preview URL via Claude Preview, reproduce, fix in `frontend/src/components/wealth/` or `stores/assessment.ts`, redeploy to preview |
| "Build the net-worth tracker" | Plan it as Phase 1 of the financial follow-up, tied to the existing `assessment.ts` Financial scoring rules. New store + new section on Wealth (or new sub-page). |
| "Add tests" | Install vitest + @testing-library/svelte, write store round-trip tests first, then a Composer save-flow test |
| "Mobile is bad" | Audit each page at 375px width via Claude Preview, fix layout/typography per page. Touch points: Today's hero header, composer-meta row, wealth radar size |

## Where to start each new session

1. Read `CLAUDE.md` (architecture + conventions)
2. Read this `SUMMARY.md` (state + open threads)
3. `git status` and `git rev-list --count origin/main..HEAD` to see how much is unpushed
4. Use Claude Preview to spin up the dev server (`preview_start name="life-stages"`)
5. Confirm with the user what they want to do *before* coding
