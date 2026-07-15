<script lang="ts">
  // Wealth-over-time. Every saved 5-Wealths result already carries a takenAt
  // date and per-dimension selfScores, so the history is free — we just plot
  // each dimension across saved results. Reuses the generic Sparkline (no chart
  // library, per the codebase rule). Needs ≥2 results to draw a trend.
  import { assessmentResults } from '../../stores/assessment';
  import { WEALTHS } from '../../data/assessment';
  import { formatDOB } from '../../utils';
  import Sparkline from './Sparkline.svelte';
  import WealthIcon from '../shared/WealthIcon.svelte';
  import type { WealthKey } from '../../types';

  // Saved results are newest-first; reverse to chronological for the trend.
  $: chronological = [...$assessmentResults].reverse();

  function pointsFor(key: WealthKey) {
    return chronological.map((r) => ({
      date: formatDOB(new Date(r.takenAt)),
      value: r.selfScores[key] ?? 0,
    }));
  }

  $: latest = $assessmentResults[0] ?? null;
  $: count = $assessmentResults.length;
</script>

<section class="wealth-trends">
  <div class="head">
    <div>
      <div class="eyebrow-modern">Over time</div>
      <h2>Your 5 Types of Wealth</h2>
    </div>
    <a class="retake" href="#/today">Retake the quiz</a>
  </div>

  {#if count === 0}
    <p class="muted">Take the 5-Wealths assessment on the Today page to start tracking how your wealth balance changes over time.</p>
  {:else if count === 1}
    <p class="muted">You've taken the assessment once. Retake it periodically (every few months) and your trend will appear here — one line per dimension.</p>
    <div class="snapshot">
      {#each WEALTHS as w}
        <div class="snap">
          <span class="snap-icon"><WealthIcon key={w.key} size={15} /></span>
          <span class="snap-label">{w.label}</span>
          <span class="snap-score">{latest?.selfScores[w.key] ?? 0}</span>
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid">
      {#each WEALTHS as w}
        <div class="row">
          <div class="row-head">
            <span class="row-label"><WealthIcon key={w.key} size={15} /> {w.label}</span>
            <span class="row-score">{latest?.selfScores[w.key] ?? 0}<span class="of">/100</span></span>
          </div>
          <Sparkline points={pointsFor(w.key)} zeroBased={true} formatValue={(v) => `${v}/100`} />
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .wealth-trends {
    margin-top: 28px;
    padding: 22px 24px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }
  .head h2 {
    font-family: var(--serif);
    font-size: 23px;
    font-weight: 500;
    margin: 6px 0 0;
    color: var(--ink);
  }
  .retake {
    flex-shrink: 0;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;
    padding: 8px 14px;
    border: 1px solid var(--accent);
    border-radius: 999px;
    transition: all 0.15s;
  }
  .retake:hover { background: var(--accent); color: #F4F0E8; }
  .muted { font-size: 14px; color: var(--ink-faint); margin: 0; line-height: 1.5; }
  .grid { display: flex; flex-direction: column; gap: 18px; }
  .row-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
  }
  .row-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }
  .row-score {
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .row-score .of { font-size: 11px; color: var(--ink-faint); font-weight: 600; }
  .snapshot {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }
  .snap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .snap-icon { display: inline-flex; color: var(--ink-dim); }
  .snap-label { font-size: 13px; color: var(--ink-dim); }
  .snap-score {
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
</style>
