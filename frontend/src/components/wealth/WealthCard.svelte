<script lang="ts">
  import type { WealthMeta, Recommendation } from '../../data/assessment';
  import { RECOMMENDATIONS } from '../../data/assessment';

  export let wealth: WealthMeta;
  export let selfScore: number | null;
  export let behavioralScore: number;

  // Show recommendations if either score is below 60.
  $: showRecs =
    (selfScore != null && selfScore < 60) || behavioralScore < 60;
  $: recs = RECOMMENDATIONS[wealth.key];

  function scoreClass(n: number): string {
    if (n >= 75) return 'high';
    if (n >= 50) return 'mid';
    return 'low';
  }
</script>

<div class="wealth-card" data-wealth={wealth.key}>
  <div class="card-head">
    <span class="emoji">{wealth.emoji}</span>
    <div>
      <div class="label">{wealth.label}</div>
      <div class="desc">{wealth.description}</div>
    </div>
  </div>

  <div class="scores">
    {#if selfScore != null}
      <div class="score self">
        <div class="score-num {scoreClass(selfScore)}">{selfScore}</div>
        <div class="score-label">Self-report</div>
      </div>
    {/if}
    <div class="score behavioral">
      <div class="score-num {scoreClass(behavioralScore)}">{behavioralScore}</div>
      <div class="score-label">Behavioral</div>
    </div>
  </div>

  {#if showRecs}
    <div class="recs">
      <div class="recs-label">Try this:</div>
      <ul>
        {#each recs as r}
          <li><a href={r.href}>{r.text}</a></li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .wealth-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px 22px;
    box-shadow: var(--shadow-sm);
  }
  .card-head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .emoji { font-size: 30px; flex-shrink: 0; }
  .label {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .desc {
    color: var(--ink-dim);
    font-size: 13px;
    margin-top: 2px;
    line-height: 1.4;
  }
  .scores {
    display: flex;
    gap: 18px;
    margin-bottom: 14px;
  }
  .score {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .score-num {
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .score.self .score-num { color: var(--accent); }
  .score.behavioral .score-num { color: var(--ink-dim); font-size: 22px; }
  .score-num.low { color: var(--love) !important; }
  .score-num.mid { /* keep default */ }
  .score-num.high { color: var(--health) !important; }
  .score-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
  }
  .recs {
    border-top: 1px dashed var(--border);
    padding-top: 12px;
    margin-top: 4px;
  }
  .recs-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
    margin-bottom: 8px;
  }
  .recs ul {
    margin: 0;
    padding-left: 18px;
    color: var(--ink);
    font-size: 14px;
    line-height: 1.55;
  }
  .recs ul li { margin-bottom: 4px; }
  .recs a {
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px dashed var(--accent);
    transition: color 0.15s;
  }
  .recs a:hover { color: var(--accent); }
</style>
