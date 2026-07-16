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

<section class="wealth-section" aria-label="Five Types of Wealth" data-tour="wealth">
  <header class="section-head">
    <div class="eyebrow-modern">5 types of wealth</div>
    <h2>The full balance sheet</h2>
    <p class="lede">Money is one of five. Time, social, mental, and physical wealth compound just as much over a lifetime.</p>
  </header>

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
    margin-top: 48px;
    padding-top: 36px;
    border-top: 1px solid rgba(255, 255, 255, 0.6);
    position: relative;
  }
  /* Soft gradient line above the section to separate it gracefully. */
  .wealth-section::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--future-3), transparent);
    opacity: 0.35;
    border-radius: 1px;
  }
  .section-head { margin-bottom: 22px; }
  .section-head h2 {
    margin: 8px 0 8px;
    font-size: clamp(24px, 4.5vw, 34px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    background: linear-gradient(120deg, var(--ink) 0%, var(--accent) 60%, var(--future-3) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .lede {
    margin: 0;
    color: var(--ink-dim);
    font-size: clamp(14px, 2.4vw, 16px);
    line-height: 1.55;
    max-width: 560px;
  }
</style>
