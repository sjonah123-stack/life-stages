<script lang="ts">
  import type { WealthMeta } from '../../data/assessment';
  import { RECOMMENDATIONS } from '../../data/assessment';

  export let wealth: WealthMeta;
  export let selfScore: number | null;
  export let behavioralScore: number;
  // Map of recId → ISO date completed. Undefined when no result is selected.
  export let completedRecommendations: Record<string, string> = {};
  // Caller toggles a rec by id. When omitted, checkboxes are hidden.
  export let onToggleRec: ((recId: string) => void) | undefined = undefined;

  // Show recommendations if either score is below 60.
  $: showRecs =
    (selfScore != null && selfScore < 60) || behavioralScore < 60;
  $: recs = RECOMMENDATIONS[wealth.key];
  // Reactive copy of the prop so the template re-evaluates done-state on every
  // change. Looking up `completedRecommendations[id]` directly inside template
  // expressions doesn't always track the prop as a dependency reliably.
  $: doneMap = completedRecommendations;

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
        {#each recs as r (r.id)}
          {@const done = !!doneMap[r.id]}
          <li class:done>
            {#if onToggleRec}
              <button
                type="button"
                class="check"
                class:checked={done}
                aria-label={done ? 'Mark as not done' : 'Mark as done'}
                aria-pressed={done}
                on:click={() => onToggleRec?.(r.id)}
              >
                {#if done}✓{/if}
              </button>
            {/if}
            <a href={r.href}>{r.text}</a>
          </li>
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
    padding: 0;
    list-style: none;
    color: var(--ink);
    font-size: 14px;
    line-height: 1.55;
  }
  .recs ul li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 6px;
  }
  .recs ul li.done a {
    color: var(--ink-faint);
    text-decoration: line-through;
    border-bottom-color: transparent;
  }
  .check {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1.5px solid var(--border);
    background: var(--panel);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    margin-top: 2px;
    color: white;
    font-size: 13px;
    font-weight: 800;
    line-height: 1;
    transition: background 0.15s, border-color 0.15s;
  }
  .check:hover { border-color: var(--accent); }
  .check.checked {
    background: var(--accent);
    border-color: var(--accent);
  }
  .recs a {
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px dashed var(--accent);
    transition: color 0.15s;
  }
  .recs a:hover { color: var(--accent); }
</style>
