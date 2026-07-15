<script lang="ts">
  // Historical body-log view: three sparklines (sleep / weight / workout)
  // plus a tabular history with delete. Reads from the existing
  // `bodyEntries` store — the daily check-in card on Today writes here.
  import { bodyEntries, deleteBodyEntry } from '../../stores/body';
  import Sparkline from './Sparkline.svelte';

  // Build chronologically-sorted point arrays per metric. Skip entries
  // where the metric is absent so we don't draw zeros where the user
  // logged only sleep on a given day.
  $: chrono = [...$bodyEntries].sort((a, b) => a.date.localeCompare(b.date));

  $: sleepPoints = chrono
    .filter((e) => typeof e.sleepHours === 'number')
    .map((e) => ({ date: e.date, value: e.sleepHours! }));

  $: weightPoints = chrono
    .filter((e) => typeof e.weight === 'number')
    .map((e) => ({ date: e.date, value: e.weight! }));

  $: workoutPoints = chrono
    .filter((e) => typeof e.workoutMinutes === 'number')
    .map((e) => ({ date: e.date, value: e.workoutMinutes! }));

  // Show the most recent 30 entries in the tabular history. The
  // sparklines already visualize the full last-90-day trend.
  $: tableEntries = [...$bodyEntries].slice(0, 30);

  function fmtHours(v: number): string {
    return v.toFixed(v % 1 === 0 ? 0 : 1) + 'h';
  }
  function fmtLbs(v: number): string {
    return Math.round(v * 10) / 10 + ' lb';
  }
  function fmtMin(v: number): string {
    return Math.round(v) + ' min';
  }

  function handleDelete(date: string) {
    if (!confirm(`Delete the check-in from ${date}?`)) return;
    deleteBodyEntry(date);
  }
</script>

<section class="module-section">
  <h2>Daily body log</h2>
  <p class="sub">
    Trends from your daily check-ins on Today. Sparklines show your last 90 entries per metric;
    the table lists the most recent 30 days with full detail.
  </p>

  {#if $bodyEntries.length === 0}
    <div class="empty">
      No check-ins yet. Open Today → log sleep, weight, or workout minutes — they appear here next time.
    </div>
  {:else}
    <div class="metric">
      <div class="metric-head">
        <span class="metric-label">Sleep</span>
        {#if sleepPoints.length > 0}
          <span class="metric-stat">
            Latest: {fmtHours(sleepPoints[sleepPoints.length - 1].value)}
            {#if sleepPoints.length >= 7}
              · 7-day avg: {fmtHours(
                sleepPoints.slice(-7).reduce((a, b) => a + b.value, 0) / Math.min(7, sleepPoints.length),
              )}
            {/if}
          </span>
        {/if}
      </div>
      <Sparkline points={sleepPoints} formatValue={fmtHours} zeroBased={true} color="var(--accent)" />
    </div>

    <div class="metric">
      <div class="metric-head">
        <span class="metric-label">Weight</span>
        {#if weightPoints.length > 0}
          <span class="metric-stat">
            Latest: {fmtLbs(weightPoints[weightPoints.length - 1].value)}
            {#if weightPoints.length >= 2}
              {@const first = weightPoints[Math.max(0, weightPoints.length - 30)].value}
              {@const latest = weightPoints[weightPoints.length - 1].value}
              {@const delta = latest - first}
              · {delta >= 0 ? '+' : '−'}{Math.abs(Math.round(delta * 10) / 10)} lb since 30 days ago
            {/if}
          </span>
        {/if}
      </div>
      <Sparkline points={weightPoints} formatValue={fmtLbs} zeroBased={false} color="var(--future-3, var(--accent))" />
    </div>

    <div class="metric">
      <div class="metric-head">
        <span class="metric-label">Workout</span>
        {#if workoutPoints.length > 0}
          <span class="metric-stat">
            Latest: {fmtMin(workoutPoints[workoutPoints.length - 1].value)}
            {#if workoutPoints.length >= 7}
              · 7-day total: {fmtMin(
                workoutPoints.slice(-7).reduce((a, b) => a + b.value, 0),
              )}
            {/if}
          </span>
        {/if}
      </div>
      <Sparkline points={workoutPoints} formatValue={fmtMin} zeroBased={true} color="var(--health, var(--accent))" />
    </div>

    <div class="entries-head">
      <span class="entries-label">Recent days</span>
      <span class="entries-count">{$bodyEntries.length} {$bodyEntries.length === 1 ? 'entry' : 'entries'} total</span>
    </div>
    <ul class="entries">
      {#each tableEntries as e (e.date)}
        <li>
          <span class="entry-date">{e.date}</span>
          <span class="entry-fields">
            {[
              e.sleepHours != null ? `${fmtHours(e.sleepHours)} sleep` : null,
              e.weight != null ? fmtLbs(e.weight) : null,
              e.workoutMinutes != null ? `${fmtMin(e.workoutMinutes)} moved` : null,
            ].filter(Boolean).join(' · ')}
          </span>
          {#if e.note}
            <span class="entry-note">{e.note}</span>
          {/if}
          <button
            class="entry-delete"
            type="button"
            aria-label="Delete entry from {e.date}"
            on:click={() => handleDelete(e.date)}
          >×</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .sub { color: var(--ink-dim); margin: 0 0 16px; font-size: 14px; line-height: 1.5; }
  .empty {
    padding: 16px;
    color: var(--ink-faint);
    font-size: 14px;
    font-style: italic;
    text-align: center;
    background: var(--panel-warm);
    border: 1px dashed var(--border);
    border-radius: 12px;
  }
  .metric { margin-bottom: 18px; }
  .metric-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .metric-label {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }
  .metric-stat {
    font-size: 12px;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .entries-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 12px 0 8px;
  }
  .entries-label {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .entries-count {
    font-size: 12px;
    color: var(--ink-dim);
  }
  .entries { list-style: none; margin: 0; padding: 0; }
  .entries li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    flex-wrap: wrap;
  }
  .entries li:last-child { border-bottom: none; }
  .entry-date {
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
    min-width: 90px;
  }
  .entry-fields {
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    flex: 1;
    min-width: 0;
  }
  .entry-note { color: var(--ink-dim); font-style: italic; }
  .entry-delete {
    background: none;
    border: none;
    color: var(--ink-faint);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
    margin-left: auto;
    font-family: inherit;
  }
  .entry-delete:hover { color: var(--love); }
</style>
