<script lang="ts">
  import { hasAssessment } from '../../stores/assessment';
  import AssessmentIntro from '../wealth/AssessmentIntro.svelte';
  import AssessmentSurvey from '../wealth/AssessmentSurvey.svelte';
  import AssessmentResults from '../wealth/AssessmentResults.svelte';

  // Local-state machine: 'intro' → 'survey' → 'results'. While the user has
  // saved results we show those by default; "Take again" flips back to survey.
  let inSurvey = false;

  $: state = inSurvey ? 'survey' : ($hasAssessment ? 'results' : 'intro');

  function startSurvey() { inSurvey = true; }
  function cancelSurvey() { inSurvey = false; }
  function completeSurvey() { inSurvey = false; }
</script>

<section class="wealth-section" aria-label="Five Types of Wealth">
  <div class="section-head">
    <div class="eyebrow">5 Types of Wealth</div>
    <h2>How balanced are you across the five wealths?</h2>
    <p class="lede">
      Money is one of five wealths. The others — time, social, mental, physical — compound just
      as much over a lifetime. Take the assessment to see where you stand and what to focus on.
    </p>
  </div>

  {#if state === 'intro'}
    <AssessmentIntro onStart={startSurvey} />
  {:else if state === 'survey'}
    <AssessmentSurvey onCancel={cancelSurvey} onComplete={completeSurvey} />
  {:else}
    <AssessmentResults onRetake={startSurvey} />
  {/if}
</section>

<style>
  .wealth-section {
    margin-top: 36px;
    padding-top: 28px;
    border-top: 1px solid var(--border);
  }
  .section-head { margin-bottom: 16px; }
  .eyebrow {
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    color: var(--ink);
  }
  .lede {
    color: var(--ink-dim);
    font-size: 15px;
    line-height: 1.55;
    margin: 0;
    max-width: 640px;
  }
</style>
