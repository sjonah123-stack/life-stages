<script lang="ts">
  import { journal } from '../../stores/collections';
  import { birthdate } from '../../stores/personal';
  import {
    getEntry, weekKey, currentWeekIndex, dateToWeekStart,
  } from '../../stores/journal-helpers';
  import { ageInYears } from '../../utils';
  import MoodSparkline from './MoodSparkline.svelte';

  // Streak: consecutive weeks with entries, walking back from this week.
  // Grace rule: if this week is empty, we don't break the streak — just
  // start counting from the previous week.
  function computeStreak(): { current: number; best: number } {
    if (!$birthdate) return { current: 0, best: 0 };
    const todayIdx = currentWeekIndex();
    const has = (i: number): boolean => {
      if (i < 0) return false;
      const e = getEntry(weekKey(i));
      return !!(e.text && e.text.trim());
    };
    let current = 0;
    let i = todayIdx;
    if (!has(i)) i--;
    while (has(i)) { current++; i--; }
    let best = 0;
    let run = 0;
    for (let j = 0; j <= todayIdx; j++) {
      if (has(j)) { run++; if (run > best) best = run; }
      else run = 0;
    }
    return { current, best };
  }

  interface Anniversary {
    yearsAgo: number;
    key: string;
    text: string;
    photo: string;
    weekStart: Date;
    age: number;
  }

  function findOldestAnniversary(): Anniversary | null {
    if (!$birthdate) return null;
    const todayWeekStart = dateToWeekStart(new Date());
    for (const y of [10, 5, 2, 1]) {
      const target = new Date(todayWeekStart);
      target.setFullYear(target.getFullYear() - y);
      const ws = dateToWeekStart(target);
      const days = Math.floor((ws.getTime() - $birthdate.getTime()) / 86400000);
      const weekIdx = Math.floor(days / 7);
      if (weekIdx < 0) continue;
      const key = weekKey(weekIdx);
      const e = getEntry(key);
      if ((e.text && e.text.trim()) || e.photo) {
        return {
          yearsAgo: y,
          key,
          text: e.text || '',
          photo: e.photo || '',
          weekStart: ws,
          age: ageInYears(ws, $birthdate),
        };
      }
    }
    return null;
  }

  // Recompute whenever the journal store updates.
  $: streak = (() => { void $journal; return computeStreak(); })();
  $: ann = (() => { void $journal; return findOldestAnniversary(); })();

  // Total entries (text or photo present) and total words across all entries.
  $: totals = (() => {
    let entries = 0;
    let words = 0;
    for (const raw of Object.values($journal)) {
      const text = typeof raw === 'string' ? raw : (raw as { text?: string }).text;
      const photo = typeof raw === 'string' ? '' : (raw as { photo?: string }).photo;
      const trimmed = (text || '').trim();
      if (!trimmed && !photo) continue;
      entries++;
      if (trimmed) words += trimmed.split(/\s+/).filter(Boolean).length;
    }
    return { entries, words };
  })();

  function fmtNum(n: number): string {
    return n.toLocaleString();
  }

  function loadAnn() {
    if (!ann) return;
    window.dispatchEvent(new CustomEvent('journal:load', { detail: { key: ann.key } }));
  }

  $: annPreview = ann
    ? (ann.text.trim() ? (ann.text.length > 160 ? ann.text.slice(0, 160) + '…' : ann.text) : '(photo entry)')
    : '';
  $: annDateStr = ann
    ? ann.weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
</script>

<div class="journal-pulse">
  {#if streak.current === 0}
    <div class="streak-card">
      <span class="streak-icon">✨</span>
      <div>
        <div class="streak-label">Start a streak</div>
        <div class="streak-meta">Any entry this week begins it.</div>
      </div>
    </div>
  {:else}
    <div class="streak-card">
      <span class="streak-icon">🔥</span>
      <div>
        <div class="streak-label">{streak.current} week streak</div>
        <div class="streak-meta">
          {streak.best > streak.current
            ? `Best: ${streak.best} ${streak.best === 1 ? 'week' : 'weeks'}`
            : 'New best!'}
        </div>
      </div>
    </div>
  {/if}

  {#if totals.entries > 0}
    <div class="totals-card">
      <div class="total-stat">
        <div class="total-num">{fmtNum(totals.entries)}</div>
        <div class="total-label">{totals.entries === 1 ? 'entry' : 'entries'}</div>
      </div>
      <div class="total-stat">
        <div class="total-num">{fmtNum(totals.words)}</div>
        <div class="total-label">{totals.words === 1 ? 'word' : 'words'}</div>
      </div>
    </div>
  {/if}

  {#if ann}
    <div
      class="anniversary-card"
      role="button"
      tabindex="0"
      on:click={loadAnn}
      on:keydown={(e) => { if (e.key === 'Enter') loadAnn(); }}
    >
      <div class="years-ago">
        {ann.yearsAgo === 1 ? '1 year ago this week' : `${ann.yearsAgo} years ago this week`}
      </div>
      <div class="anniversary-meta">{annDateStr} · Age {ann.age}</div>
      <div class="anniversary-preview">"{annPreview}"</div>
    </div>
  {:else}
    <div class="anniversary-card placeholder">
      <div class="years-ago">No anniversaries yet</div>
      <div class="anniversary-meta">In a year, an entry from this week will surface here.</div>
      <div class="anniversary-preview">Keep writing — the magic compounds.</div>
    </div>
  {/if}
</div>

<MoodSparkline />

<style>
  .journal-pulse {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(160px, auto) 2fr;
    gap: 12px;
    margin-bottom: 22px;
  }
  @media (max-width: 720px) { .journal-pulse { grid-template-columns: 1fr; } }
  .totals-card {
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 18px;
    gap: 14px;
  }
  .total-stat { text-align: center; }
  .total-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .total-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
    margin-top: 4px;
  }
  .streak-card {
    background: linear-gradient(135deg, rgba(255, 201, 60, 0.18), rgba(255, 140, 97, 0.10));
    border: 1px solid rgba(255, 140, 97, 0.22);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .streak-icon { font-size: 28px; flex-shrink: 0; }
  .streak-label {
    font-size: 16px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .streak-meta {
    font-size: 12px;
    color: var(--ink-dim);
    margin-top: 1px;
  }

  .anniversary-card {
    background: linear-gradient(135deg, rgba(185, 131, 255, 0.12), rgba(122, 162, 255, 0.10));
    border: 1px solid rgba(185, 131, 255, 0.24);
    border-radius: 14px;
    padding: 14px 16px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .anniversary-card.placeholder {
    cursor: default;
    opacity: 0.7;
  }
  .anniversary-card:not(.placeholder):hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  .years-ago {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--growth);
    font-weight: 700;
  }
  .anniversary-meta {
    font-size: 12px;
    color: var(--ink-dim);
    margin: 2px 0 6px;
    font-weight: 600;
  }
  .anniversary-preview {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.5;
    font-style: italic;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
</style>
