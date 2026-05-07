<script lang="ts">
  import { journal } from '../../stores/collections';
  import {
    currentWeekIndex, weekKey, getEntry, weekStartDate,
  } from '../../stores/journal-helpers';
  import { MOOD_OPTIONS } from '../../config';
  import type { Mood } from '../../types';

  // Map mood emoji → 1..5 ordinal. Empty mood ('') = null (gap).
  const MOOD_VALUE: Record<Exclude<Mood, ''>, number> = {
    '😞': 1, '😕': 2, '😐': 3, '🙂': 4, '😄': 5,
  };

  const WEEKS = 52;
  const W = 600;
  const H = 70;
  const PAD_X = 8;
  const PAD_Y = 10;

  interface Point { idx: number; week: number; mood: Exclude<Mood, ''> | null; }

  // Reactive: array of {week index globally, mood value or null} for the
  // last 52 weeks. Driven by both $journal and the current week.
  $: points = (() => {
    void $journal;
    const today = currentWeekIndex();
    const out: Point[] = [];
    for (let i = 0; i < WEEKS; i++) {
      const w = today - (WEEKS - 1 - i);
      if (w < 0) { out.push({ idx: i, week: w, mood: null }); continue; }
      const e = getEntry(weekKey(w));
      out.push({ idx: i, week: w, mood: e.mood && e.mood !== '' ? e.mood as Exclude<Mood, ''> : null });
    }
    return out;
  })();

  // Plot only weeks that have a mood; track gaps for stroke segments.
  $: plotted = points.map((p) => {
    if (p.mood == null) return { x: xFor(p.idx), y: null as number | null };
    return { x: xFor(p.idx), y: yFor(MOOD_VALUE[p.mood]) };
  });

  // Build SVG path with M/L breaks across gaps (null y).
  $: pathD = (() => {
    let d = '';
    let pen: 'up' | 'down' = 'up';
    for (const p of plotted) {
      if (p.y == null) { pen = 'up'; continue; }
      d += (pen === 'up' ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} ` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)} `);
      pen = 'down';
    }
    return d.trim();
  })();

  $: count = plotted.filter((p) => p.y != null).length;

  function xFor(idx: number): number {
    return PAD_X + (idx / (WEEKS - 1)) * (W - PAD_X * 2);
  }
  function yFor(value: number): number {
    // 1 → bottom, 5 → top
    const norm = (value - 1) / 4;
    return H - PAD_Y - norm * (H - PAD_Y * 2);
  }

  // Tooltip state
  let hoverIdx: number | null = null;

  $: hoverPoint = hoverIdx != null ? points[hoverIdx] : null;
  $: hoverWeekDate = hoverPoint && hoverPoint.week >= 0
    ? weekStartDate(hoverPoint.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
</script>

<div class="mood-spark">
  <div class="head">
    <span class="label">Mood · last 52 weeks</span>
    <span class="legend-line">
      {#each MOOD_OPTIONS as m}<span class="legend-mood" title="{MOOD_VALUE[m]}">{m}</span>{/each}
    </span>
  </div>
  {#if count === 0}
    <div class="empty">Set a mood on a few weekly entries and the trend appears here.</div>
  {:else}
    <svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" role="img" aria-label="Weekly mood trend">
      <!-- Mid baseline (mood = 3, neutral) -->
      <line x1={PAD_X} x2={W - PAD_X} y1={yFor(3)} y2={yFor(3)} class="baseline" />
      <!-- Connected line through mood points -->
      <path d={pathD} class="line" />
      <!-- Dots, with hover hit-rects for the tooltip -->
      {#each plotted as p, i (i)}
        {#if p.y != null}
          <circle cx={p.x} cy={p.y} r="2.5" class="dot" />
        {/if}
        <rect
          x={p.x - (W - PAD_X * 2) / WEEKS / 2}
          y={0}
          width={(W - PAD_X * 2) / WEEKS}
          height={H}
          class="hit"
          on:mouseenter={() => hoverIdx = i}
          on:mouseleave={() => hoverIdx = null}
          on:focus={() => hoverIdx = i}
          on:blur={() => hoverIdx = null}
          tabindex="-1"
        ></rect>
      {/each}
    </svg>
    {#if hoverPoint}
      <div class="tip">
        <span class="tip-mood">{hoverPoint.mood ?? '—'}</span>
        <span class="tip-date">{hoverPoint.mood ? hoverWeekDate : 'no mood'}</span>
      </div>
    {:else}
      <div class="tip placeholder">
        <span class="tip-count">{count} of 52 weeks logged</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .mood-spark {
    grid-column: 1 / -1;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 16px;
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
  }
  .legend-line {
    display: inline-flex;
    gap: 4px;
    opacity: 0.75;
    font-size: 14px;
  }
  .empty {
    color: var(--ink-faint);
    font-size: 12px;
    font-style: italic;
    padding: 8px 0;
  }
  svg {
    width: 100%;
    height: 70px;
    display: block;
  }
  .baseline {
    stroke: var(--border);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.6;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .dot {
    fill: var(--accent);
  }
  .hit {
    fill: transparent;
    cursor: crosshair;
  }
  .tip {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--ink-dim);
    min-height: 16px;
    font-variant-numeric: tabular-nums;
  }
  .tip.placeholder { color: var(--ink-faint); font-style: italic; }
  .tip-mood { font-size: 16px; line-height: 1; }
  .tip-date { font-weight: 600; }
</style>
