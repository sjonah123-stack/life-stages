<script lang="ts">
  // AI reflection over the user's journal — surfaces recurring themes and a
  // short, non-judgemental reflection. Gated to signed-in users; needs a few
  // entries to be worth running. The result is cached locally so it persists
  // across reloads until refreshed.
  import { journal } from '../../stores/collections';
  import { currentUser } from '../../stores/auth';
  import { analyzeJournal } from '../../lib/ai';
  import { latestInsight } from '../../stores/ai';

  let loading = false;
  let error = '';

  $: entryTexts = Object.values($journal)
    .map((e) => e?.text?.trim())
    .filter((t): t is string => !!t);
  $: enough = entryTexts.length >= 3;

  async function analyze() {
    loading = true;
    error = '';
    try {
      const insight = await analyzeJournal(entryTexts);
      latestInsight.set({ ...insight, generatedAt: Date.now() });
    } catch (e) {
      error = 'AI is unavailable right now. (Firebase AI Logic must be enabled.)';
    } finally {
      loading = false;
    }
  }
</script>

<section class="ai-insight">
  <div class="insight-head">
    <div>
      <div class="eyebrow-modern">AI reflection</div>
      <h2>Patterns in your journal</h2>
    </div>
    {#if $currentUser && enough}
      <button class="reflect-btn" type="button" on:click={analyze} disabled={loading}>
        {loading ? 'Reading…' : $latestInsight ? 'Refresh' : '✦ Reflect'}
      </button>
    {/if}
  </div>

  {#if !$currentUser}
    <p class="muted">Sign in to let AI surface the themes running through your entries.</p>
  {:else if !enough}
    <p class="muted">Write a few journal entries and AI can reflect on the patterns.</p>
  {:else if error}
    <p class="muted">{error}</p>
  {:else if $latestInsight}
    {#if $latestInsight.themes.length}
      <div class="themes">
        {#each $latestInsight.themes as t}<span class="chip">{t}</span>{/each}
      </div>
    {/if}
    <p class="reflection">{$latestInsight.reflection}</p>
  {:else}
    <p class="muted">Tap “Reflect” for an AI read on the themes running through your entries.</p>
  {/if}
</section>

<style>
  .ai-insight {
    margin-top: 28px;
    padding: 22px 24px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
  }
  .insight-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 12px;
  }
  .insight-head h2 {
    font-family: var(--serif);
    font-size: 23px;
    font-weight: 500;
    margin: 6px 0 0;
    color: var(--ink);
  }
  .reflect-btn {
    flex-shrink: 0;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 999px;
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    transition: all 0.15s;
  }
  .reflect-btn:hover:not(:disabled) { background: var(--accent); color: #F4F0E8; }
  .reflect-btn:disabled { opacity: 0.6; cursor: default; }
  .muted { font-size: 14px; color: var(--ink-faint); margin: 0; }
  .themes {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .chip {
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent-deep);
  }
  .reflection {
    font-family: var(--serif);
    font-size: 20px;
    line-height: 1.5;
    font-style: italic;
    color: var(--ink);
    margin: 0;
  }
</style>
