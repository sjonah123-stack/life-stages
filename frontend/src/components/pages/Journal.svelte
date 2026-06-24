<script lang="ts">
  import Composer from '../journal/Composer.svelte';
  import EntryFeed from '../journal/EntryFeed.svelte';
  import JournalPulse from '../journal/JournalPulse.svelte';
  import WeeksGrid from '../journal/WeeksGrid.svelte';
  import FutureLetters from '../journal/FutureLetters.svelte';
  import AiJournalInsight from '../journal/AiJournalInsight.svelte';
  import PageHeader from '../shared/PageHeader.svelte';

  function handleEdit(key: string) {
    window.dispatchEvent(new CustomEvent('journal:load', { detail: { key } }));
  }
</script>

<section class="page">
  <PageHeader
    title="Your journal"
    subtitle="Write at the top, edit anything below, view the full timeline at the bottom. Pick any date — write about any week of your life."
  />

  <JournalPulse />
  <Composer />
  <AiJournalInsight />
  <EntryFeed onEditEntry={handleEdit} />

  <details class="calendar-collapse">
    <summary>Calendar view — all 4,680 weeks</summary>
    <div class="calendar-content">
      <WeeksGrid />
    </div>
  </details>

  <FutureLetters />
</section>

<style>
  .calendar-collapse {
    margin-top: 28px;
  }
  .calendar-collapse > summary {
    cursor: pointer;
    list-style: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 999px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-dim);
    box-shadow: var(--shadow-sm);
    transition: all 0.15s;
  }
  .calendar-collapse > summary::-webkit-details-marker { display: none; }
  .calendar-collapse > summary::before {
    content: '›';
    color: var(--accent);
    font-weight: 800;
    transition: transform 0.15s;
  }
  .calendar-collapse[open] > summary::before { transform: rotate(90deg); }
  .calendar-collapse > summary:hover { color: var(--accent); border-color: var(--accent); }
  .calendar-collapse[open] > summary {
    border-color: var(--accent);
    color: var(--accent);
  }
  .calendar-content {
    margin-top: 14px;
  }
</style>
