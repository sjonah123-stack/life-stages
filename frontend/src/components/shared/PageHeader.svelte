<script lang="ts">
  // Standard page header used by Settings, Journal, Goals, and the
  // placeholder pages. Today.svelte uses its own gradient hero header
  // instead — this is the plain variant.
  export let title: string;
  export let subtitle: string = '';
</script>

<header>
  <h1 class="page-title">{title}</h1>
  {#if subtitle}<p class="page-subtitle">{subtitle}</p>{/if}
</header>

<style>
  header { margin-bottom: 0; }
  .page-title {
    font-size: 28px;
    font-weight: 800;
    margin: 0 0 6px;
    color: var(--ink);
    letter-spacing: -0.02em;
  }
  .page-subtitle {
    color: var(--ink-dim);
    margin: 0 0 28px;
    font-size: 15px;
    line-height: 1.5;
  }
</style>
