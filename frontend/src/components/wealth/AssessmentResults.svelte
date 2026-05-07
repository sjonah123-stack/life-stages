<script lang="ts">
  import {
    assessmentResults,
    latestAssessment,
    behavioralScores,
    deleteAssessment,
    toggleRecommendation,
  } from '../../stores/assessment';
  import { WEALTHS } from '../../data/assessment';
  import type { WealthKey } from '../../types';
  import WealthRadar from './WealthRadar.svelte';
  import WealthCard from './WealthCard.svelte';

  export let onRetake: (() => void) | undefined = undefined;

  // User-picked override; null means "show the latest". Reset to null when
  // the picked result is deleted or otherwise leaves the list.
  let pickedId: string | null = null;

  $: list = $assessmentResults;
  $: if (pickedId !== null && !list.some((r) => r.id === pickedId)) pickedId = null;

  $: current = pickedId ? list.find((r) => r.id === pickedId) ?? null : $latestAssessment;
  $: self = current?.selfScores ?? null;
  $: behavioral = $behavioralScores;

  function fmtDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  // Lowest 1-2 wealths by averaged blended score → "focus here this month".
  $: focusKeys = (() => {
    const keys = WEALTHS.map((w) => w.key);
    const blended = (k: WealthKey): number => {
      const s = self?.[k];
      const b = behavioral[k];
      return s != null ? Math.round((s + b) / 2) : b;
    };
    return [...keys].sort((a, b) => blended(a) - blended(b)).slice(0, 2);
  })();

  $: focusWealths = focusKeys.map((k) => WEALTHS.find((w) => w.key === k)!);

  function handleDelete() {
    if (!current) return;
    if (!confirm(`Delete the result from ${fmtDate(current.takenAt)}? This won't affect your other saved results.`)) return;
    deleteAssessment(current.id);
  }
</script>

{#if current}
  <div class="results">
    <div class="results-head">
      <div class="head-left">
        <div class="meta-row">
          {#if list.length > 1}
            <label class="picker">
              <span class="picker-label">Result</span>
              <select bind:value={pickedId}>
                {#each list as r (r.id)}
                  <option value={r.id}>{fmtDate(r.takenAt)}</option>
                {/each}
              </select>
            </label>
            <span class="saved-count">{list.length} saved</span>
          {:else}
            <div class="meta">Assessment taken {fmtDate(current.takenAt)}</div>
          {/if}
        </div>
        <h2>Your wealth balance</h2>
      </div>
      <div class="head-actions">
        <button class="btn ghost" on:click={handleDelete}>Delete</button>
        <button class="btn primary" on:click={() => onRetake?.()}>↻ Take again</button>
      </div>
    </div>

    <div class="radar-row">
      <div class="radar-cell">
        <WealthRadar self={self} behavioral={behavioral} />
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
          completedRecommendations={current.completedRecommendations}
          onToggleRec={(recId) => toggleRecommendation(current.id, recId)}
        />
      {/each}
    </div>

    <p class="footnote">
      <strong>Self-report</strong> reflects how you feel today. <strong>Behavioral</strong>
      reflects how much of the related tooling you've used in this app. The gap between them
      is often the most interesting story. Check off recommendations as you act on them — the
      checkmarks are saved with this result.
    </p>
  </div>
{/if}

<style>
  .results { display: flex; flex-direction: column; gap: 20px; margin-top: 8px; }
  .results-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }
  .head-left { min-width: 0; }
  .meta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .meta {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .picker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 12px 4px 14px;
  }
  .picker-label {
    font-size: 10px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }
  .picker select {
    background: transparent;
    border: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
    padding: 2px 0;
  }
  .picker select:focus { outline: none; }
  .saved-count {
    font-size: 11px;
    color: var(--ink-faint);
    font-weight: 600;
  }
  h2 {
    margin: 6px 0 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .head-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .btn {
    border-radius: 10px;
    padding: 7px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-dim);
    transition: all 0.15s;
  }
  .btn.ghost:hover { border-color: var(--love); color: var(--love); }
  .btn.primary:hover { border-color: var(--accent); color: var(--accent); }

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
