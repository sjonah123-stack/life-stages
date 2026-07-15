<script lang="ts">
  // Compact journal stats strip — streak, totals, and the mood sparkline.
  // Sits below the composer; the "years ago" surface lives in the
  // composer's OnThisDayBanner (this used to duplicate it).
  import { journal } from '../../stores/collections';
  import { birthdate } from '../../stores/personal';
  import { getEntry, weekKey, currentWeekIndex } from '../../stores/journal-helpers';
  import MoodSparkline from './MoodSparkline.svelte';
  import FlameIcon from '../shared/FlameIcon.svelte';

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

  // Recompute whenever the journal store updates.
  $: streak = (() => { void $journal; return computeStreak(); })();

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
</script>

{#if totals.entries > 0 || streak.current > 0}
  <div class="pulse-strip">
    <div class="stat streak" class:active={streak.current > 0}>
      <span class="flame"><FlameIcon size={14} /></span>
      <span class="stat-num">{streak.current}</span>
      <span class="stat-label">week streak</span>
    </div>
    {#if streak.best > streak.current}
      <div class="stat">
        <span class="stat-num">{streak.best}</span>
        <span class="stat-label">best</span>
      </div>
    {/if}
    <div class="stat">
      <span class="stat-num">{fmtNum(totals.entries)}</span>
      <span class="stat-label">{totals.entries === 1 ? 'entry' : 'entries'}</span>
    </div>
    <div class="stat">
      <span class="stat-num">{fmtNum(totals.words)}</span>
      <span class="stat-label">{totals.words === 1 ? 'word' : 'words'}</span>
    </div>
  </div>

  <MoodSparkline />
{/if}

<style>
  .pulse-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 18px 0 14px;
  }
  .stat {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 8px 14px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
  }
  .stat.streak.active {
    background: color-mix(in srgb, var(--accent) 8%, var(--panel));
    border-color: color-mix(in srgb, var(--accent) 25%, transparent);
  }
  .flame {
    display: inline-flex;
    align-self: center;
    color: var(--accent);
  }
  .stat-num {
    font-size: 16px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
  }
</style>
