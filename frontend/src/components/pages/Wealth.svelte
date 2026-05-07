<script lang="ts">
  import { hasAssessment } from '../../stores/assessment';
  import PageHeader from '../shared/PageHeader.svelte';
  import AssessmentIntro from '../wealth/AssessmentIntro.svelte';
  import AssessmentSurvey from '../wealth/AssessmentSurvey.svelte';
  import AssessmentResults from '../wealth/AssessmentResults.svelte';

  // Three local states: 'intro' (no result, not in survey), 'survey' (taking),
  // 'results' (have a result and showing it).
  let inSurvey = false;

  $: state = $hasAssessment ? 'results' : (inSurvey ? 'survey' : 'intro');

  function startSurvey() { inSurvey = true; }
  function cancelSurvey() { inSurvey = false; }
</script>

<section class="page">
  <PageHeader
    title="Your 5 wealths"
    subtitle="Money is one of five wealths. The others — time, social, mental, physical — compound just as much over a lifetime."
  />

  {#if state === 'intro'}
    <AssessmentIntro onStart={startSurvey} />
  {:else if state === 'survey'}
    <AssessmentSurvey onCancel={cancelSurvey} />
  {:else}
    <AssessmentResults />
  {/if}
</section>
