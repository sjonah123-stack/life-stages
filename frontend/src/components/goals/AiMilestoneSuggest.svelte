<script lang="ts">
  // AI milestone suggestions (Firebase AI Logic / Gemini). Gated to signed-in
  // users so AI billing is tied to an authenticated account. Suggestions are
  // proposals only — the user reviews each and chooses what to add to Goals.
  import { currentStage } from '../../stores/derived';
  import { todayAge } from '../../stores/personal';
  import { milestones } from '../../stores/collections';
  import { currentUser } from '../../stores/auth';
  import { suggestMilestones } from '../../lib/ai';
  import type { Milestone } from '../../types';

  let loading = false;
  let error = '';
  let suggestions: Milestone[] = [];

  $: stageName = $currentStage?.name ?? 'this stage of life';

  async function suggest() {
    loading = true;
    error = '';
    suggestions = [];
    try {
      suggestions = await suggestMilestones(stageName, $todayAge);
      if (suggestions.length === 0) error = 'No suggestions came back — try again.';
    } catch (e) {
      error = 'AI is unavailable right now. (Firebase AI Logic must be enabled for the project.)';
    } finally {
      loading = false;
    }
  }

  function addOne(m: Milestone) {
    milestones.update((arr) => {
      const next = [...arr, m];
      next.sort((a, b) => a.age - b.age);
      return next;
    });
    suggestions = suggestions.filter((s) => s !== m);
  }

  function dismiss() {
    suggestions = [];
    error = '';
  }
</script>

<div class="ai-suggest">
  {#if !$currentUser}
    <p class="ai-hint">Sign in to get AI milestone suggestions tailored to your stage.</p>
  {:else}
    <button class="ai-btn" type="button" on:click={suggest} disabled={loading}>
      {loading ? 'Thinking…' : '✦ Suggest milestones with AI'}
    </button>

    {#if error}<p class="ai-error">{error}</p>{/if}

    {#if suggestions.length}
      <div class="ai-head">
        <span>For “{stageName}” — add the ones that resonate</span>
        <button class="ai-dismiss" type="button" on:click={dismiss}>Dismiss</button>
      </div>
      <div class="ai-cards">
        {#each suggestions as s (s.label)}
          <div class="ai-card">
            <div class="ai-card-head">
              <span class="ai-card-label">{s.label}</span>
              <span class="ai-card-age">by {s.age}</span>
            </div>
            {#if s.measure}<div class="ai-card-line"><b>Measure</b> {s.measure}</div>{/if}
            {#if s.why}<div class="ai-card-line"><b>Why</b> {s.why}</div>{/if}
            <button class="ai-add" type="button" on:click={() => addOne(s)}>+ Add to goals</button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .ai-suggest { margin: 14px 0 4px; }
  .ai-hint {
    font-size: 13px;
    color: var(--ink-faint);
    margin: 0;
  }
  .ai-btn {
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 600;
    padding: 9px 16px;
    border-radius: 999px;
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    transition: all 0.15s;
  }
  .ai-btn:hover:not(:disabled) { background: var(--accent); color: #F4F0E8; }
  .ai-btn:disabled { opacity: 0.6; cursor: default; }
  .ai-error {
    font-size: 13px;
    color: var(--accent-deep);
    margin: 10px 0 0;
  }
  .ai-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin: 18px 0 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .ai-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--sans);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    text-decoration: underline;
  }
  .ai-cards {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
  .ai-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px 18px;
    box-shadow: var(--shadow-sm);
  }
  .ai-card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
  }
  .ai-card-label {
    font-family: var(--serif);
    font-size: 19px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.1;
  }
  .ai-card-age {
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    white-space: nowrap;
  }
  .ai-card-line {
    font-size: 13px;
    line-height: 1.45;
    color: var(--ink-dim);
    margin-top: 4px;
  }
  .ai-card-line b {
    color: var(--ink-faint);
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-right: 6px;
  }
  .ai-add {
    margin-top: 14px;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 999px;
    border: none;
    background: var(--ink);
    color: #F4F0E8;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .ai-add:hover { opacity: 0.85; }
</style>
