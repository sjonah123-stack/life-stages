# Session Summary — life-stages

Last updated: 2026-06-24 — redesign + data-loss fix + Cloud Functions backend + AI features all live.

## Where prod stands

| | URL | Status |
|---|---|---|
| **Production** | https://life-stages-90806.web.app | Serving the **latest** build (redesign + all fixes + AI). |
| **Legacy archive** | https://life-stages-90806.web.app/legacy.html | Old single-file app, frozen. |

Backend is deployed: 3 Cloud Functions (Node 22), Firestore + Storage rules released. The user
pushes commits via **GitHub Desktop** (the terminal here has no git auth). Tell them the pending
commit count each session: `git rev-list --count origin/main..HEAD`.

## Major work this session (2026-06-24)

1. **Editorial redesign — shipped.** Whole app re-skinned to one design language (cream/charcoal/
   terracotta, Cormorant Garamond + Hanken Grotesk) via the `app.css` CSS-variable system. 3-theme
   switcher retired (`theme` field read-tolerant only). People page removed. Re-skin only, no IA change.
2. **Data-loss bug — fixed + hardened.** The auth observer used to wipe local data + reload on every
   sign-in, which overwrote the user's cloud data (unrecoverable — no PITR was on; they chose a clean
   slate). Now `authTransition` loads-not-wipes on sign-in; plus empty-overwrite guard, load-side
   rescue, rolling client snapshots. See CLAUDE.md "Cloud sync gotchas".
3. **Backend buildout (Cloud Functions).** `archiveUserVersion` trigger → server-side version history
   in `users/{uid}/versions` (last 20); `list`/`restoreUserVersion` callables. Journal photos moved
   out of the 1 MB Firestore doc into Cloud Storage (`lib/photos.ts`, `migrateJournalPhotos`).
   User-owned export/import (Settings → Your data).
4. **AI features (Firebase AI Logic / Gemini).** `lib/ai.ts` (GoogleAIBackend, `gemini-3.5-flash`,
   structured-output Schemas, tested normalizers). Milestone suggestions (Goals), journal insights
   (Journal), reflective prompts (Composer). Gated to signed-in users; App Check wired but dormant.

## ⚠️ Owed by the user (console only — Claude can't do these)

1. **AI Studio billing** — AI calls return `429 prepayment credits depleted` until pay-as-you-go is
   enabled for the Gemini API at aistudio.google.com. **This is the only thing blocking AI** — code,
   model, and wiring are correct and proven (a live call reached `gemini-3.5-flash:generateContent`).
2. **App Check** — create a reCAPTCHA v3 key → set `RECAPTCHA_SITE_KEY` in `config.ts` → enable
   enforcement. Protects AI from billing abuse.
3. **Firestore PITR / scheduled backups** — optional now that version history is live; recommended.

## Design decisions (don't relitigate)

- **One editorial palette, no theme switcher.** Colours/fonts are CSS vars in `app.css`.
- **No chart library** — the wealth radar is hand-rolled SVG. Precedent.
- **Cloud sync = `users/{uid}` doc, `setDoc(merge:true)`.** All persisted state flows through
  `stores/persisted.ts`. Migration logic lives in the store (`setFromCloud`), not in cloud-sync.
- **Wealth assessment lives on Today**, not its own tab. Blended scoring (self-report + behavioral).
- **AI output is never trusted** (always normalized) and **never written to the snapshots buffer**.
  Journal insights persist locally (regenerable), not in Firestore.
- **AI runs on the Gemini Developer API, not Vertex** — `gemini-3.5-flash` only exists on the
  Developer API (Vertex 404s on it in us-central1). Billing therefore goes through AI Studio.

## Known gaps / backlog

- **App Check is dormant** until the reCAPTCHA key is set — AI is unprotected from abuse meanwhile.
- **Mobile polish** — audit pages at 375px (hero h1, composer-meta wrap, radar grid).
- **In-app version-restore UI** — `list`/`restoreUserVersion` are deployed but not surfaced in the UI.
- **Leftover old-palette colour** in the Composer prompt box (`rgba(255,201,60,…)`).
- **TodayWealth** renders the full results inline; a collapsed summary state would be nicer.
- **Deferred Blaze features** — email-send digests, BigQuery export.

## Improvement loop

`improvement-loop/` holds a scored `BACKLOG.json`, ideas inbox, and an email-digest loop (3 scheduled
tasks). See `improvement-loop/LOOP.md`. The scheduled sandbox can't build/test/deploy — that happens
in an interactive Mac session.

## Where to start each session

1. Read `CLAUDE.md` (architecture + conventions) and this file.
2. `git status` + `git rev-list --count origin/main..HEAD` for unpushed state.
3. `preview_start name="life-stages"` for the dev server.
4. Confirm with the user what they want *before* coding; deploy preview-channel-first for big changes.
