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
  <div class="stat" data-kind="age">
    <div class="stat-label">{ageLabel}</div>
    <div class="stat-value">{stats.age}<span class="unit">yrs</span></div>
  </div>
  <div class="stat" data-kind="past">
    <div class="stat-label">{pastLabel}</div>
    <div class="stat-value">{formatNum(stats.sunrises)}</div>
  </div>
  <div class="stat" data-kind="ahead1">
    <div class="stat-label">{ahead1Label}</div>
    <div class="stat-value">{formatNum(stats.weekendsAhead)}</div>
  </div>
  <div class="stat" data-kind="ahead2">
    <div class="stat-label">{ahead2Label}</div>
    <div class="stat-value">{formatNum(stats.seasonsAhead)}</div>
  </div>
</div>

<style>
  .stat-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }
  .stat {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }
  .stat::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--stat-color, var(--accent));
  }
  .stat[data-kind='age']    { --stat-color: var(--accent); }
  .stat[data-kind='past']   { --stat-color: var(--past); }
  .stat[data-kind='ahead1'] { --stat-color: var(--future-2); }
  .stat[data-kind='ahead2'] { --stat-color: var(--future-3); }
  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    margin-bottom: 6px;
    font-weight: 700;
  }
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
  }
  .unit {
    color: var(--ink-dim);
    font-weight: 500;
    font-size: 13px;
    margin-left: 4px;
  }
</style>
