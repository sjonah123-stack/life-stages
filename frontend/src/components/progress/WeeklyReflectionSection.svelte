<script lang="ts">
  // AI weekly reflection — a warm, personal weekly check-in across the user's
  // journal, habit activity, and wealth balance, ending in one concrete focus
  // for the week ahead. Gated to signed-in users (billing). Cached locally
  // (regenerable) like the journal insight — never written to the cloud doc.
  import { journal } from '../../stores/collections';
  import { habitChecks } from '../../stores/habits';
  import { behavioralScores } from '../../stores/assessment';
  import { currentStage } from '../../stores/derived';
  import { currentUser } from '../../stores/auth';
  import { reflectOnWeek } from '../../lib/ai';
  import { latestWeeklyReflection } from '../../stores/ai';
  import { WEALTHS } from '../../data/assessment';
  import { parseDOB, daysBetween } from '../../utils';

  let loading = false;
  let error = '';

  $: stageName = $currentStage?.name ?? 'this stage of life';

  $: recentEntries = Object.values($journal)
    .map((e) => e?.text?.trim())
    .filter((t): t is string => !!t);

  $: habitCheckins = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return $habitChecks.filter((c) => {
      const d = parseDOB(c.date);
      return d ? daysBetween(d, today) <= 7 : false;
    }).length;
  })();

  function weakestWealthLabel(): string | undefined {
    const scores = $behavioralScores as Record<string, number>;
    let weakestKey = '';
    let min = Infinity;
    for (const k of Object.keys(scores)) {
      if (scores[k] < min) { min = scores[k]; weakestKey = k; }
    }
    return WEALTHS.find((w) => w.key === weakestKey)?.label;
  }

  // Worth running once there's something to reflect on.
  $: enough = recentEntries.length >= 1 || habitCheckins >= 1;

  async function reflect() {
    loading = true;
    error = '';
    try {
      const result = await reflectOnWeek({
        stage: stageName,
        recentEntries,
        habitCheckins,
        weakestWealth: weakestWealthLabel(),
      });
      latestWeeklyReflection.set({ ...result, generatedAt: Date.now() });
    } catch (e) {
      error = 'AI is unavailable right now. (Firebase AI Logic must be enabled.)';
    } finally {
      loading = false;
    }
  }
</script>

<section class="weekly">
  <div class="head">
    <div>
      <div class="eyebrow-modern">AI weekly reflection</div>
      <h2>Your week, in focus</h2>
    </div>
    {#if $currentUser && enough}
      <button class="reflect-btn" type="button" on:click={reflect} disabled={loading}>
        {loading ? 'Reflecting…' : $latestWeeklyReflection ? 'Refresh' : '✦ Reflect on my week'}
      </button>
    {/if}
  </div>

  {#if !$currentUser}
    <p class="muted">Sign in to get a personal weekly reflection across your journal, habits, and wealth balance.</p>
  {:else if !enough}
    <p class="muted">Journal an entry or check off a habit this week, and AI can reflect on how it went.</p>
  {:else if error}
    <p class="muted">{error}</p>
  {:else if $latestWeeklyReflection}
    <p class="reflection">{$latestWeeklyReflection.reflection}</p>
    {#if $latestWeeklyReflection.focus}
      <div class="focus">
        <span class="focus-label">This week’s focus</span>
        <p class="focus-text">{$latestWeeklyReflection.focus}</p>
      </div>
    {/if}
  {:else}
    <p class="muted">Tap “Reflect on my week” for a warm read on how your week went, plus one focus for the next.</p>
  {/if}
</section>

<style>
  .weekly {
    margin-top: 28px;
    padding: 22px 24px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 12px;
  }
  .head h2 {
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
  .muted { font-size: 14px; color: var(--ink-faint); margin: 0; line-height: 1.5; }
  .reflection {
    font-family: var(--serif);
    font-size: 20px;
    line-height: 1.5;
    font-style: italic;
    color: var(--ink);
    margin: 0;
  }
  .focus {
    margin-top: 16px;
    padding: 14px 16px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 14px;
  }
  .focus-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--accent-deep);
  }
  .focus-text {
    margin: 6px 0 0;
    font-size: 15px;
    line-height: 1.45;
    color: var(--ink);
  }
</style>
