<script lang="ts">
  import Composer from '../journal/Composer.svelte';
  import EntryFeed from '../journal/EntryFeed.svelte';

  // Reference to the Composer so we can scroll to it / load an entry on Edit.
  let composerLoadFor: ((key: string) => void) | undefined;

  function handleEdit(key: string) {
    // Composer reads its own date input, so simplest cross-component
    // approach: dispatch a custom event the Composer listens for.
    window.dispatchEvent(new CustomEvent('journal:load', { detail: { key } }));
  }
</script>

<section class="page">
  <h1 class="page-title">Your journal</h1>
  <p class="page-subtitle">
    Write at the top, edit anything below, view the full timeline at the bottom. Pick any date —
    write about any week of your life.
  </p>

  <Composer />
  <EntryFeed onEditEntry={handleEdit} />
</section>

<style>
  .page { animation: fadeInPage 0.25s ease-out; }
  @keyframes fadeInPage {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .page-title {
    font-size: 28px;
    font-weight: 800;
    margin: 0 0 6px;
    color: var(--ink);
  }
  .page-subtitle {
    color: var(--ink-dim);
    margin: 0 0 28px;
    font-size: 15px;
    line-height: 1.5;
  }
</style>
