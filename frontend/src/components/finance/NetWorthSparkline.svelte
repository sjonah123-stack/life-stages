<script lang="ts">
  import type { NetWorthEntry } from '../../types';

  // Newest-first list (matches the store shape). The chart plots the last
  // 12 entries chronologically left-to-right. No chart library — the
  // codebase rule (CLAUDE.md) is to hand-roll SVG, matching WealthRadar
  // and MoodSparkline.
  export let entries: NetWorthEntry[] = [];

  const W = 600;
  const H = 80;
  const PAD_X = 12;
  const PAD_Y = 14;
  const MAX_POINTS = 12;

  // Take the newest 12 entries, then reverse to get chronological order
  // (oldest left, newest right) for the plot.
  $: chronological = entries.slice(0, MAX_POINTS).slice().reverse();

  $: minAmount = chronological.length
    ? Math.min(...chronological.map((e) => e.amount))
    : 0;
  $: maxAmount = chronological.length
    ? Math.max(...chronological.map((e) => e.amount))
    : 0;

  function xFor(idx: number, total: number): number {
    if (total <= 1) return W / 2;
    return PAD_X + (idx * (W - 2 * PAD_X)) / (total - 1);
  }
  function yFor(amount: number): number {
    if (maxAmount === minAmount) return H / 2;
    const t = (amount - minAmount) / (maxAmount - minAmount);
    // y is inverted in SVG (top = 0); higher amount → smaller y.
    return PAD_Y + (1 - t) * (H - 2 * PAD_Y);
  }

  $: points = chronological.map((e, i) => ({
    e,
    x: xFor(i, chronological.length),
    y: yFor(e.amount),
  }));

  $: pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  let hoveredIdx: number | null = null;
  function fmt(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(amount);
  }
</script>

{#if chronological.length < 2}
  <div class="empty">
    {chronological.length === 0
      ? 'Add a second check-in to see your trend.'
      : 'One check-in so far — add another and a sparkline appears here.'}
  </div>
{:else}
  <div class="sparkline-wrap">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img" aria-label="Net worth sparkline (last {chronological.length} check-ins)">
      <path d={pathD} fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      {#each points as p, i}
        <circle
          cx={p.x}
          cy={p.y}
          r={hoveredIdx === i ? 5 : 3}
          fill={hoveredIdx === i ? 'var(--accent)' : 'var(--panel)'}
          stroke="var(--accent)"
          stroke-width="1.5"
          on:mouseenter={() => (hoveredIdx = i)}
          on:mouseleave={() => (hoveredIdx = null)}
        />
      {/each}
    </svg>
    {#if hoveredIdx !== null}
      {@const hp = points[hoveredIdx]}
      <div class="tooltip">
        <strong>{fmt(hp.e.amount)}</strong>
        <span>{hp.e.date}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .sparkline-wrap {
    position: relative;
    width: 100%;
  }
  svg {
    width: 100%;
    height: 80px;
    display: block;
    overflow: visible;
  }
  circle {
    cursor: pointer;
    transition: r 0.12s ease, fill 0.12s ease;
  }
  .tooltip {
    position: absolute;
    top: -8px;
    right: 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: var(--shadow-sm);
    pointer-events: none;
  }
  .tooltip strong { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
  .tooltip span { color: var(--ink-faint); font-size: 11px; }
  .empty {
    padding: 16px;
    color: var(--ink-faint);
    font-size: 13px;
    text-align: center;
    background: var(--panel-warm);
    border: 1px dashed var(--border);
    border-radius: 12px;
  }
</style>
