<script lang="ts">
  import Composer from '../journal/Composer.svelte';
  import EntryFeed from '../journal/EntryFeed.svelte';
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

  <Composer />
  <EntryFeed onEditEntry={handleEdit} />
</section>
