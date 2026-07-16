# life-stages

A personal life dashboard built around the **5 Types of Wealth** framework (Sahil Bloom).
Single-user-per-account PWA: walk the years of your life on a slider, journal weekly,
keep daily habits (one-tap check-offs, streaks, confetti, achievement badges), and run a
budget-first finance page — monthly category targets vs. actuals, pay-yourself-first
savings goals, and a 10%-of-income giving tracker. Periodic 5-Wealths self-assessment
scored against real app behavior. Gemini-powered goal suggestions (grounded in your
actual habits and journal), journal insights, weekly reflections, and a budget coach.
Guided first-run tour; swipe between pages on mobile.

**Live:** https://life-stages-90806.web.app · **Firebase project:** `life-stages-90806`

## Stack

Svelte 5 + TypeScript + Vite · Firebase Auth + Firestore (cross-device sync) ·
vite-plugin-pwa (offline) · Vitest. No backend beyond Firebase — a pure static SPA.
The real app lives in `frontend/`; the root `index.html` is a frozen legacy archive
served at `/legacy.html` (don't edit it).

## Quick start

```bash
cd frontend
npm install
npm run dev            # local dev
npm test               # unit tests (Vitest)
npm run build          # production build → frontend/dist
```

## Deploy

```bash
firebase hosting:channel:deploy <name> --expires 7d   # preview first
firebase deploy --only hosting                         # then production
```

Commit via CLI or GitHub Desktop; pushes go through GitHub Desktop.

## Project docs

- **`CLAUDE.md`** — architecture, conventions, and hard constraints. Read this before
  working in the codebase.
- **`SUMMARY.md`** — latest session handoff: what's done, what's pending.
- **`improvement-loop/`** — a self-running backlog + email-digest loop for deciding what
  to build next (see `improvement-loop/LOOP.md`).
