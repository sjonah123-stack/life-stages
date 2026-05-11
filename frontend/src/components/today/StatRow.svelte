<script lang="ts">
  import { selectedAge, isToday, isPast } from '../../stores/slider';
  import { personalHorizon } from '../../stores/derived';
  import { formatNum } from '../../utils';

  $: age = $selectedAge;
  $: horizon = $personalHorizon;
  $: aheadYears = Math.max(0, horizon - age);
  $: stats = {
    age,
    sunrises: age * 365,
    weekendsAhead: aheadYears * 52,
    seasonsAhead: aheadYears * 4,
  };
  $: ageLabel = $isToday ? "Right now" : ($isPast ? "Age (past)" : "Age (future)");
  $: pastLabel = $isToday ? "Sunrises witnessed" : "Sunrises by then";
  $: ahead1Label = $isToday ? "Weekends ahead" : ($isPast ? "Weekends that lay ahead" : "Weekends still ahead");
  $: ahead2Label = $isToday ? "Seasons ahead" : ($isPast ? "Seasons that lay ahead" : "Seasons still ahead");
</script>

<div class="stat-row">
  <div class="stat glass" data-kind="age">
    <div class="stat-label">{ageLabel}</div>
    <div class="stat-value">{stats.age}<span class="unit">yrs</span></div>
  </div>
  <div class="stat glass" data-kind="past">
    <div class="stat-label">{pastLabel}</div>
    <div class="stat-value">{formatNum(stats.sunrises)}</div>
  </div>
  <div class="stat glass" data-kind="ahead1">
    <div class="stat-label">{ahead1Label}</div>
    <div class="stat-value">{formatNum(stats.weekendsAhead)}</div>
  </div>
  <div class="stat glass" data-kind="ahead2">
    <div class="stat-label">{ahead2Label}</div>
    <div class="stat-value">{formatNum(stats.seasonsAhead)}</div>
  </div>
</div>

<style>
  .stat-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .stat {
    border-radius: 18px;
    padding: 16px 18px 18px;
    position: relative;
    overflow: hidden;
    transition: transform 0.18s ease;
  }
  .stat:hover { transform: translateY(-2px); }
  /* Per-stat gradient stripe on the top edge. */
  .stat::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--stat-c1, var(--accent)), var(--stat-c2, var(--future-3)));
  }
  .stat[data-kind='age']    { --stat-c1: var(--accent);   --stat-c2: var(--love); }
  .stat[data-kind='past']   { --stat-c1: var(--past);     --stat-c2: var(--accent); }
  .stat[data-kind='ahead1'] { --stat-c1: var(--future-2); --stat-c2: var(--future-3); }
  .stat[data-kind='ahead2'] { --stat-c1: var(--future-3); --stat-c2: var(--growth); }
  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-faint);
    margin-bottom: 8px;
    font-weight: 700;
  }
  .stat-value {
    font-size: 26px;
    font-weight: 800;
    color: var(--ink);
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .unit {
    color: var(--ink-dim);
    font-weight: 600;
    font-size: 13px;
    margin-left: 4px;
  }
</style>
