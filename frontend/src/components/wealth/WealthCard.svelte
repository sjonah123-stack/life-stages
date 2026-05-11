<script lang="ts">
  import type { WealthMeta, RecommendationId } from '../../data/assessment';
  import { RECOMMENDATIONS } from '../../data/assessment';

  export let wealth: WealthMeta;
  export let selfScore: number | null;
  export let behavioralScore: number;
  export let completedRecommendations: Record<string, string> = {};
  export let onToggleRec: ((recId: RecommendationId) => void) | undefined = undefined;

  $: showRecs = (selfScore != null && selfScore < 60) || behavioralScore < 60;
  $: recs = RECOMMENDATIONS[wealth.key];

  function scoreClass(n: number): string {
    if (n >= 75) return 'high';
    if (n >= 50) return 'mid';
    return 'low';
  }

  // Blended score for the ring visual — averages self + behavioral when
  // both exist, otherwise falls back to whichever is present.
  $: ring = (() => {
    const s = selfScore;
    const b = behavioralScore;
    return s != null ? Math.round((s + b) / 2) : b;
  })();
</script>

<div class="wealth-card glass" data-wealth={wealth.key}>
  <div class="card-halo" aria-hidden="true"></div>

  <div class="card-head">
    <div class="head-meta">
      <div class="glyph"><span>{wealth.emoji}</span></div>
      <div class="head-text">
        <div class="label">{wealth.label}</div>
        <div class="desc">{wealth.description}</div>
      </div>
    </div>

    <!-- Conic-gradient ring visualizes the blended score. -->
    <div
      class="ring {scoreClass(ring)}"
      style="--ring-pct: {Math.max(0, Math.min(100, ring))}%"
      aria-label="Blended wealth score {ring}"
    >
      <div class="ring-inner">
        <span class="ring-num">{ring}</span>
      </div>
    </div>
  </div>

  <div class="scores">
    {#if selfScore != null}
      <div class="score">
        <div class="score-bar"><div class="bar self" style="width: {selfScore}%"></div></div>
        <div class="score-foot">
          <span class="score-label">Self-report</span>
          <span class="score-num {scoreClass(selfScore)}">{selfScore}</span>
        </div>
      </div>
    {/if}
    <div class="score">
      <div class="score-bar"><div class="bar behavioral" style="width: {behavioralScore}%"></div></div>
      <div class="score-foot">
        <span class="score-label">Behavioral</span>
        <span class="score-num {scoreClass(behavioralScore)}">{behavioralScore}</span>
      </div>
    </div>
  </div>

  {#if showRecs}
    <div class="recs">
      <div class="recs-label">Try this</div>
      <ul>
        {#each recs as r (r.id)}
          {@const done = !!completedRecommendations[r.id]}
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
  /* Per-wealth color tokens — drives halo, glyph, ring and bar accents. */
  .wealth-card[data-wealth='time']      { --w-c1: var(--future-3); --w-c2: var(--growth); }
  .wealth-card[data-wealth='social']    { --w-c1: var(--love);     --w-c2: var(--accent); }
  .wealth-card[data-wealth='mental']    { --w-c1: var(--growth);   --w-c2: var(--career); }
  .wealth-card[data-wealth='physical']  { --w-c1: var(--health);   --w-c2: var(--career); }
  .wealth-card[data-wealth='financial'] { --w-c1: var(--money);    --w-c2: var(--accent); }

  .wealth-card {
    position: relative;
    border-radius: 22px;
    padding: 24px 24px 22px;
    overflow: hidden;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .wealth-card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.7) inset,
      0 18px 40px -10px rgba(44, 24, 16, 0.16),
      0 6px 14px -4px rgba(44, 24, 16, 0.06);
  }
  .wealth-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--w-c1), var(--w-c2));
    border-radius: 22px 22px 0 0;
    z-index: 2;
  }

  .card-halo {
    position: absolute;
    top: -50%;
    right: -25%;
    width: 65%;
    height: 130%;
    background: radial-gradient(circle, var(--w-c1) 0%, transparent 65%);
    opacity: 0.18;
    filter: blur(8px);
    pointer-events: none;
    z-index: 0;
  }
  .wealth-card > :not(.card-halo) { position: relative; z-index: 1; }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 18px;
  }
  .head-meta {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;
  }
  .glyph {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3)),
      linear-gradient(135deg, var(--w-c1), var(--w-c2));
    background-blend-mode: overlay, normal;
    border: 1px solid rgba(255, 255, 255, 0.65);
    box-shadow:
      0 4px 12px -2px color-mix(in srgb, var(--w-c1) 38%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.7) inset;
    flex-shrink: 0;
  }
  .glyph span { font-size: 22px; line-height: 1; filter: saturate(1.15); }
  .head-text { min-width: 0; }
  .label {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .desc {
    color: var(--ink-dim);
    font-size: 12.5px;
    margin-top: 2px;
    line-height: 1.4;
  }

  /* Conic-gradient ring. The mask uses two stops so the colored arc shows up
     to --ring-pct and the rest fades into the panel background. */
  .ring {
    --ring-color: var(--w-c1);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    background:
      conic-gradient(
        from -90deg,
        var(--ring-color) 0% var(--ring-pct, 50%),
        rgba(44, 24, 16, 0.08) var(--ring-pct, 50%) 100%
      );
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px -3px color-mix(in srgb, var(--w-c1) 30%, transparent);
  }
  .ring.low  { --ring-color: var(--love); }
  .ring.high { --ring-color: var(--health); }
  .ring-inner {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--panel);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ring-num {
    font-size: 16px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    letter-spacing: -0.02em;
  }

  .scores {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }
  .score { display: flex; flex-direction: column; gap: 5px; }
  .score-bar {
    height: 6px;
    background: rgba(44, 24, 16, 0.06);
    border-radius: 999px;
    overflow: hidden;
  }
  .bar {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .bar.self { background: linear-gradient(90deg, var(--w-c1), var(--w-c2)); }
  .bar.behavioral { background: linear-gradient(90deg, var(--ink-faint), color-mix(in srgb, var(--w-c1) 50%, var(--ink-faint))); opacity: 0.7; }
  .score-foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .score-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ink-faint);
    font-weight: 700;
  }
  .score-num {
    font-size: 14px;
    font-weight: 800;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .score-num.low  { color: var(--love); }
  .score-num.high { color: var(--health); }

  .recs {
    border-top: 1px dashed rgba(44, 24, 16, 0.12);
    padding-top: 12px;
    margin-top: 4px;
  }
  .recs-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--w-c1);
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
    border: 1.5px solid rgba(44, 24, 16, 0.18);
    background: rgba(255, 255, 255, 0.7);
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
  .check:hover { border-color: var(--w-c1); }
  .check.checked {
    background: linear-gradient(135deg, var(--w-c1), var(--w-c2));
    border-color: transparent;
  }
  .recs a {
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px dashed var(--w-c1);
    transition: color 0.15s;
  }
  .recs a:hover { color: var(--w-c1); }
</style>
