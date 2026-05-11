<script lang="ts">
  // Generic time-series sparkline for the Progress page. Takes a list of
  // {date, value} points and a value formatter. Hand-rolled SVG to match
  // the codebase's no-chart-library rule (WealthRadar, MoodSparkline,
  // NetWorthSparkline all use the same idiom).

  export let points: { date: string; value: number }[] = [];
  export let formatValue: (v: number) => string = (v) => String(v);
  export let color = 'var(--accent)';
  // When true, the y-axis starts at 0 (good for sleep / workout where
  // 0 is meaningful). When false, auto-scales to min/max of the data
  // (good for weight where the range is narrow + relative).
  export let zeroBased = false;
  // Max points to show. Older points are dropped from the head of the
  // input; the caller pre-sorts.
  export let maxPoints = 90;

  $: visible = points.slice(-maxPoints);

  $: minValue = visible.length
    ? (zeroBased ? 0 : Math.min(...visible.map((p) => p.value)))
    : 0;
  $: maxValue = visible.length
    ? Math.max(...visible.map((p) => p.value))
    : 1;

  const W = 600;
  const H = 80;
  const PAD_X = 12;
  const PAD_Y = 14;

  function xFor(idx: number, total: number): number {
    if (total <= 1) return W / 2;
    return PAD_X + (idx * (W - 2 * PAD_X)) / (total - 1);
  }
  function yFor(value: number): number {
    if (maxValue === minValue) return H / 2;
    const t = (value - minValue) / (maxValue - minValue);
    return PAD_Y + (1 - t) * (H - 2 * PAD_Y);
  }

  $: plotted = visible.map((p, i) => ({
    p,
    x: xFor(i, visible.length),
    y: yFor(p.value),
  }));
  $: pathD = plotted.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(' ');

  let hoveredIdx: number | null = null;
</script>

{#if visible.length < 2}
  <div class="empty">
    {visible.length === 0
      ? 'No data yet — log a few entries to see the trend.'
      : 'Add a second entry to see your trend.'}
  </div>
{:else}
  <div class="sparkline-wrap">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img" aria-label="Trend sparkline">
      <path d={pathD} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      {#each plotted as d, i}
        <circle
          cx={d.x}
          cy={d.y}
          r={hoveredIdx === i ? 5 : 3}
          fill={hoveredIdx === i ? color : 'var(--panel)'}
          stroke={color}
          stroke-width="1.5"
          on:mouseenter={() => (hoveredIdx = i)}
          on:mouseleave={() => (hoveredIdx = null)}
        />
      {/each}
    </svg>
    {#if hoveredIdx !== null}
      {@const h = plotted[hoveredIdx]}
      <div class="tooltip">
        <strong>{formatValue(h.p.value)}</strong>
        <span>{h.p.date}</span>
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
