<script lang="ts">
  import { hasAssessment } from '../../stores/assessment';
  import AssessmentIntro from '../wealth/AssessmentIntro.svelte';
  import AssessmentSurvey from '../wealth/AssessmentSurvey.svelte';
  import AssessmentResults from '../wealth/AssessmentResults.svelte';

  type State = 'intro' | 'survey' | 'results';

  let inSurvey = false;

  $: state = (
    inSurvey ? 'survey'
    : $hasAssessment ? 'results'
    : 'intro'
  ) satisfies State;

  const startSurvey = () => { inSurvey = true; };
  const closeSurvey = () => { inSurvey = false; };
</script>

<section class="wealth-section" aria-label="Five Types of Wealth">
  <div class="eyebrow">5 Types of Wealth</div>

  {#if state === 'intro'}
    <AssessmentIntro onStart={startSurvey} />
  {:else if state === 'survey'}
    <AssessmentSurvey onClose={closeSurvey} />
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
  .eyebrow {
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    margin-bottom: 16px;
  }
</style>
