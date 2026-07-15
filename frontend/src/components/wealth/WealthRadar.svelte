<script lang="ts">
  // Hand-rolled SVG radar — no chart library. Five spokes, two overlaid
  // polygons (self-report filled, behavioral outline). Scores are 0-100.
  import type { WealthScores } from '../../types';
  import { WEALTHS } from '../../data/assessment';
  import WealthIcon from '../shared/WealthIcon.svelte';

  export let self: WealthScores | null;
  export let behavioral: WealthScores;
  export let size = 320;

  // Geometry
  $: radius = size / 2 - 40;
  $: cx = size / 2;
  $: cy = size / 2;

  const angles = WEALTHS.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / WEALTHS.length);

  function pointAt(value: number, angle: number): [number, number] {
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  }

  function polygonPoints(scores: Record<string, number>, keys: string[]): string {
    return keys
      .map((k, i) => {
        const [x, y] = pointAt(scores[k] ?? 0, angles[i]);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  $: keys = WEALTHS.map((w) => w.key);
  $: behavioralPoints = polygonPoints(behavioral as Record<string, number>, keys);
  $: selfPoints = self ? polygonPoints(self as Record<string, number>, keys) : '';

  // Concentric reference circles at 25/50/75/100
  const rings = [25, 50, 75, 100];
</script>

<div class="radar-wrap" style="--size: {size}px">
  <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Wealth radar chart">
    <!-- reference rings -->
    {#each rings as ring}
      <circle
        cx={cx}
        cy={cy}
        r={(ring / 100) * radius}
        class="ring"
      />
    {/each}
    <!-- spokes + axis labels -->
    {#each WEALTHS as w, i}
      {@const [x, y] = pointAt(100, angles[i])}
      {@const [lx, ly] = pointAt(118, angles[i])}
      <line x1={cx} y1={cy} x2={x} y2={y} class="spoke" />
      <g class="axis-label">
        <WealthIcon key={w.key} size={20} x={lx - 10} y={ly - 10} />
      </g>
    {/each}
    <!-- behavioral polygon (outline) -->
    <polygon points={behavioralPoints} class="behavioral" />
    <!-- self-report polygon (filled) -->
    {#if self}
      <polygon points={selfPoints} class="self" />
    {/if}
    <!-- vertex dots: self-report -->
    {#if self}
      {#each WEALTHS as w, i}
        {@const [x, y] = pointAt((self as Record<string, number>)[w.key] ?? 0, angles[i])}
        <circle cx={x} cy={y} r="3.5" class="dot self-dot" />
      {/each}
    {/if}
    <!-- vertex dots: behavioral -->
    {#each WEALTHS as w, i}
      {@const [x, y] = pointAt((behavioral as Record<string, number>)[w.key] ?? 0, angles[i])}
      <circle cx={x} cy={y} r="3" class="dot behavioral-dot" />
    {/each}
  </svg>
  <div class="legend">
    {#if self}
      <span class="legend-item"><span class="swatch self"></span>Self-report</span>
    {/if}
    <span class="legend-item"><span class="swatch behavioral"></span>Behavioral</span>
  </div>
</div>

<style>
  .radar-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  svg { width: var(--size); height: var(--size); max-width: 100%; }
  .ring {
    fill: none;
    stroke: var(--border);
    stroke-width: 1;
    opacity: 0.6;
  }
  .spoke {
    stroke: var(--border);
    stroke-width: 1;
    opacity: 0.5;
  }
  .axis-label {
    color: var(--ink-dim);
  }
  .behavioral {
    fill: none;
    stroke: var(--ink-dim);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
  }
  .self {
    fill: var(--accent);
    fill-opacity: 0.18;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .dot.self-dot { fill: var(--accent); }
  .dot.behavioral-dot { fill: var(--ink-dim); }
  .legend {
    display: flex;
    gap: 14px;
    font-size: 12px;
    color: var(--ink-dim);
    font-weight: 600;
  }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .swatch {
    width: 14px;
    height: 4px;
    border-radius: 2px;
  }
  .swatch.self { background: var(--accent); }
  .swatch.behavioral {
    background: linear-gradient(to right, var(--ink-dim) 50%, transparent 50%);
    background-size: 4px 4px;
    background-color: var(--ink-dim);
    background-image: linear-gradient(to right, var(--bg-1) 50%, transparent 50%);
    background-size: 4px 100%;
  }
</style>
