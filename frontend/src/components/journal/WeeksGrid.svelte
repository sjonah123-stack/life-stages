<script lang="ts">
  import { weeksLived } from '../../stores/personal';
  import { journal } from '../../stores/collections';
  import { weekKey, getEntry, weekStartDate, ageAtWeek, weekRangeStr } from '../../stores/journal-helpers';
  import { LIFESPAN } from '../../config';

  // Total cells: 52 weeks × 90 years = 4680
  const TOTAL = LIFESPAN * 52;
  const indices = Array.from({ length: TOTAL }, (_, i) => i);

  // Which weeks have entries / photos? Recompute when journal changes.
  $: entryKeys = new Set(Object.keys($journal));

  function classFor(i: number, lived: number, hasEntry: boolean, hasPhoto: boolean): string {
    let cls = 'week';
    if (i < lived) cls += ' lived';
    else if (i === lived) cls += ' now';
    if (hasEntry) cls += ' has-entry';
    if (hasPhoto) cls += ' has-photo';
    return cls;
  }

  function tooltip(i: number): string {
    const range = weekRangeStr(i);
    const age = ageAtWeek(i);
    return age >= 0 ? `${range} · age ${age}` : range;
  }

  function onClick(i: number) {
    window.dispatchEvent(new CustomEvent('journal:load', { detail: { key: weekKey(i) } }));
  }
</script>

<div class="weeks-card">
  <p class="sub">
    Each square is one week of life. Past weeks in warm gold (memory). Future weeks in possibility
    colors. <strong>Click any week to write/edit.</strong> Accent ring = has an entry.
  </p>
  <div class="weeks-grid" role="list">
    {#each indices as i}
      {@const k = weekKey(i)}
      {@const e = entryKeys.has(k) ? getEntry(k) : null}
      {@const hasEntry = !!(e && e.text && e.text.trim())}
      {@const hasPhoto = !!(e && e.photo)}
      <div
        role="listitem"
        class={classFor(i, $weeksLived, hasEntry, hasPhoto)}
        title={tooltip(i)}
        on:click={() => onClick(i)}
        on:keydown={(ev) => { if (ev.key === 'Enter') onClick(i); }}
        tabindex="0"
      ></div>
    {/each}
  </div>
  <div class="legend">
    <div class="legend-item"><span class="swatch lived"></span>Lived</div>
    <div class="legend-item"><span class="swatch now"></span>This week</div>
    <div class="legend-item"><span class="swatch ahead"></span>Ahead</div>
    <div class="legend-item"><span class="swatch entry"></span>Has entry</div>
  </div>
</div>

<style>
  .weeks-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 20px 24px;
    box-shadow: var(--shadow-sm);
  }
  .sub {
    color: var(--ink-dim);
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.5;
  }
  .weeks-grid {
    display: grid;
    grid-template-columns: repeat(52, 1fr);
    gap: 2px;
  }
  .week {
    aspect-ratio: 1 / 1;
    border-radius: 2px;
    background: var(--future-1);
    transition: background 0.15s, transform 0.15s;
    cursor: pointer;
  }
  .week:hover { transform: scale(1.4); z-index: 3; position: relative; }
  .week.lived { background: var(--past-dim); }
  .week.now {
    background: var(--now);
    box-shadow: 0 0 8px rgba(255, 201, 60, 0.5);
  }
  .week.has-entry {
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }
  .week.has-photo {
    box-shadow: inset 0 0 0 1.5px var(--growth);
  }
  .week.has-entry.has-photo {
    box-shadow: inset 0 0 0 1.5px var(--accent), inset 0 0 0 3px var(--growth);
  }
  .legend {
    display: flex;
    gap: 16px;
    margin-top: 14px;
    flex-wrap: wrap;
    color: var(--ink-dim);
    font-size: 12px;
  }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid rgba(0, 0, 0, 0.06);
  }
  .swatch.lived { background: var(--past-dim); }
  .swatch.now   { background: var(--now); }
  .swatch.ahead { background: var(--future-1); }
  .swatch.entry { background: transparent; box-shadow: inset 0 0 0 1.5px var(--accent); }
</style>
