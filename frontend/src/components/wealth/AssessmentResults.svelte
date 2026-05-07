<script lang="ts">
  import { assessmentResult, behavioralScores, clearAssessment } from '../../stores/assessment';
  import { WEALTHS } from '../../data/assessment';
  import type { WealthKey, WealthScores } from '../../types';
  import WealthRadar from './WealthRadar.svelte';
  import WealthCard from './WealthCard.svelte';

  $: self = $assessmentResult?.selfScores ?? null;
  $: behavioral = $behavioralScores;

  // Lowest 1-2 wealths by averaged blended score → "focus here this month".
  $: focusKeys = (() => {
    const keys = WEALTHS.map((w) => w.key);
    const blended = (k: WealthKey): number => {
      const s = self?.[k];
      const b = behavioral[k];
      if (s != null) return Math.round((s + b) / 2);
      return b;
    };
    return [...keys].sort((a, b) => blended(a) - blended(b)).slice(0, 2);
  })();

  $: focusWealths = focusKeys.map((k) => WEALTHS.find((w) => w.key === k)!);

  $: takenAtStr = $assessmentResult
    ? new Date($assessmentResult.takenAt).toLocaleDateString(undefined, {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : '';

  function retake() {
    if (!confirm('Re-take the assessment? Your previous result will be replaced.')) return;
    clearAssessment();
  }
</script>

<div class="results">
  <div class="results-head">
    <div>
      <div class="meta">Assessment taken {takenAtStr}</div>
      <h2>Your wealth balance</h2>
    </div>
    <button class="retake-btn" on:click={retake}>↻ Re-take</button>
  </div>

  <div class="radar-row">
    <div class="radar-cell">
      <WealthRadar self={self as WealthScores | null} behavioral={behavioral} />
    </div>
    <div class="focus">
      <div class="focus-label">Focus here this month</div>
      <ul>
        {#each focusWealths as w}
          <li>
            <span class="emoji">{w.emoji}</span>
            <span class="name">{w.label}</span>
          </li>
        {/each}
      </ul>
      <p class="focus-note">
        Lowest 1–2 scores. Picking one and giving it intentional attention for 30 days
        usually moves the needle more than scattering across all five.
      </p>
    </div>
  </div>

  <div class="cards">
    {#each WEALTHS as w}
      <WealthCard
        wealth={w}
        selfScore={self?.[w.key] ?? null}
        behavioralScore={behavioral[w.key]}
      />
    {/each}
  </div>

  <p class="footnote">
    <strong>Self-report</strong> reflects how you feel today. <strong>Behavioral</strong>
    reflects how much of the related tooling you've used in this app. The gap between them
    is often the most interesting story.
  </p>
</div>

<style>
  .results { display: flex; flex-direction: column; gap: 20px; margin-top: 8px; }
  .results-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }
  .meta {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  h2 {
    margin: 4px 0 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .retake-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 7px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink-dim);
    transition: all 0.15s;
  }
  .retake-btn:hover { border-color: var(--accent); color: var(--accent); }

  .radar-row {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 1fr;
    gap: 24px;
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 24px 28px;
    box-shadow: var(--shadow-sm);
  }
  @media (max-width: 720px) {
    .radar-row { grid-template-columns: 1fr; }
  }
  .radar-cell { display: flex; justify-content: center; }

  .focus-label {
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .focus ul { list-style: none; padding: 0; margin: 0 0 14px; }
  .focus li {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 14px;
    background: var(--panel-warm);
    border-radius: 10px;
    margin-bottom: 6px;
  }
  .focus .emoji { font-size: 22px; }
  .focus .name {
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .focus-note {
    font-size: 13px;
    color: var(--ink-dim);
    line-height: 1.5;
    margin: 0;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }

  .footnote {
    color: var(--ink-faint);
    font-size: 12px;
    line-height: 1.55;
    text-align: center;
    margin-top: 8px;
  }
</style>
