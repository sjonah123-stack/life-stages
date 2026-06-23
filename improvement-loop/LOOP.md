# The Improvement Loop

A closed loop for continuously improving life-stages. Two engines feed one
prioritized backlog; a weekly autonomous run keeps it fresh; a live dashboard shows
the state.

```
  ┌─────────────────┐     ┌──────────────────────┐
  │ Idea capture    │     │ Automated app review │
  │ (IDEAS_INBOX.md │     │ (svelte-check, tests,│
  │  + dashboard)   │     │  TODOs, known gaps)  │
  └────────┬────────┘     └──────────┬───────────┘
           │                         │
           └────────────┬────────────┘
                        ▼
              ┌───────────────────┐
              │   BACKLOG.json    │  ← single source of truth, scored
              └─────────┬─────────┘
                        ▼
          ┌──────────────────────────┐
          │  Weekly loop runner       │  (scheduled, autonomous)
          │  re-scores · regenerates  │
          │  dashboard · reports      │
          └─────────┬─────────────────┘
                    ▼
         ┌──────────────────────┐
         │  Live dashboard       │  ← you look here; pick what to build
         │  (Cowork artifact)    │
         └──────────┬───────────┘
                    ▼
               You build it ──► status: done ──► loop repeats
```

## Pieces

| File / thing | Role |
|---|---|
| `BACKLOG.json` | Source of truth. Every item has id, type, status, value, effort, score, notes. |
| `IDEAS_INBOX.md` | Freeform capture. Runner ingests the **Unprocessed** section into the backlog. |
| `LOOP.md` | This file. |
| Weekly scheduled task `life-stages-improvement-loop` | Runs the loop autonomously (Mondays 8am local). |
| Dashboard artifact `life-stages-backlog` | Read-only view of the backlog + add-idea box. Refreshed by each weekly run. |
| Digest task `life-stages-digest` | Every 2 days, 8am: drafts an email digest + notifies you in-app. |
| Reply-builder task `life-stages-build-replies` | Every 2 days (offset): reads your replies, builds + ships approved changes, replies with what shipped. |
| `loop-state.json` | Tracks last digest + which replies have been processed (so nothing is built twice). |

## The email loop (every 2 days)

```
  Digest task ──► drafts "[life-stages] Build digest" to you + in-app notification
                        │
                        ▼
              You reply with decisions:  "build net-worth-tracker",
              "skip bundle-size", "change mobile pass to only fix the hero h1"…
                        │
                        ▼
  Reply-builder task ──► reads new replies (Gmail) ──► implements approved items
                        ──► verify (svelte-check + tests + build + preview smoke)
                        ──► ship to prod (guardrail: major/risky → preview link only)
                        ──► drafts a reply telling you what shipped
                        ──► updates BACKLOG.json + dashboard
```

**Reply grammar (loose — plain English works).** The builder understands lines like:
`build <id>`, `ship <id>`, `skip <id>` / `wont-do <id>`, `icebox <id>`,
`change <id>: <new direction>`, `new: <freeform idea>`. You can also just describe
what you want in prose; it maps to backlog ids by best match.

**Delivery note.** The Gmail connector can draft + read but not send. So the digest is
delivered as an in-app notification (the live ping) plus a Gmail **draft** as the record.
To reply: open the draft in Gmail, send it to yourself, and reply with your decisions —
or just tell Claude in chat. The reply-builder finds your replies by the `[life-stages]`
subject marker and skips any message id already in `loop-state.json`.

### Keep docs current after every change (with a length guardrail)

Whenever the loop (or a build session) lands a change, refresh the project docs **and keep them
lean** — prune stale lines, don't just append:

- `CLAUDE.md` (≲230 lines) — architecture/constraints; add durable facts only.
- `SUMMARY.md` (≲120 lines) — latest-state snapshot; it's a snapshot, so rewrite the top rather
  than stacking session logs.
- `README.md` (≲60 lines) — short human overview; never let it become a CLAUDE.md copy again.
- `BACKLOG.json` / this `LOOP.md` — keep statuses honest.

The point of the cap: bloated docs eat the context window every future session loads, which
defeats their purpose. If a doc is over budget, trim before adding.

### Environment reality (important)

The scheduled tasks run in a Linux sandbox that **cannot build, test, or deploy** the app:
no Firebase CLI, the npm registry is unreachable so deps won't install, and the mounted
folder blocks file deletion (which also jams `git` after the first commit). So the loop is
split:

- **Autonomous (sandbox):** digest → read replies → triage decisions into `BACKLOG.json` →
  update the dashboard → draft the reply email. All of this works (the Write tool persists
  files even when git/build don't).
- **Build + deploy (your Mac):** the actual coding, `npm test && npm run build`,
  `firebase deploy`, and the commit/push happen in an interactive Cowork session on your
  Mac (where the toolchain + Firebase auth live). The reply email hands you a per-item
  build plan to make that fast.

If git ever reports a stale `.git/index.lock`, delete that file on your Mac and commit via
GitHub Desktop — the sandbox can't remove it.

Optional path to true autonomous deploy: generate a Firebase CI token on your Mac
(`firebase login:ci`) and store it as a `FIREBASE_TOKEN` secret the task can read, plus a
deps cache the sandbox can reach. That's real infra setup and involves a secret you'd
manage yourself — not needed for a personal project, but it's the only way to remove the
Mac-in-the-loop step.

### Ship-to-prod guardrails (you chose auto-ship)

The builder will deploy to production on its own ONLY when all of these hold:
`svelte-check` 0 errors · `npm test` passes · `npm run build` succeeds · preview channel
deploys and serves. Anything it judges **major or risky** — touching `stores/auth.ts`,
`stores/cloud-sync.ts`, data migrations, the persisted-store helper, or a large diff —
is deployed to a **preview channel only**, and the reply gives you the link to approve
before prod. It never `git push`es (no auth here; you push via GitHub Desktop) and never
edits the legacy `index.html`.

## Scoring

`score = round((value / effort) * 10)`, where value and effort are each 1–5
(5 = highest value / most effort). Higher score = do sooner. It's a heuristic to sort,
not gospel — override by editing the item or telling Claude.

## Item lifecycle

`backlog → in-progress → done` (or `icebox` for parked, `wont-do` to drop).
Done items move to the `archive` array so the active list stays clean but history survives.

## What the weekly runner does

1. Reads CLAUDE.md, SUMMARY.md, BACKLOG.json, IDEAS_INBOX.md.
2. **Automated review:** `npx svelte-check`, `npm test`, scans for new TODO/FIXME, and
   re-checks the "Known gaps" in SUMMARY.md. New findings become `type: review` items.
3. **Ingests** the inbox Unprocessed section → new items; moves text to Processed.
4. **De-dupes & re-scores** the whole backlog.
5. **Regenerates** the dashboard artifact with the current state.
6. **Commits** the updated files (CLI commit only — never pushes; you push via GitHub Desktop).
7. **Reports** a short summary: what's new, top 3 to build next, anything that regressed.

## Closing the loop manually

When you finish an item, tell Claude "mark <id> done" (or edit BACKLOG.json:
set status `done`, move to `archive`). The next run reflects it. To run the whole
loop on demand instead of waiting for Monday, say "run the improvement loop now."
