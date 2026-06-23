<script lang="ts">
  // Standard page header used by Settings, Journal, Goals, and the
  // placeholder pages. Today.svelte uses its own gradient hero header
  // instead — this is the plain variant.
  export let title: string;
  export let subtitle: string = '';
  // Optional small uppercase label above the title (the editorial eyebrow).
  export let eyebrow: string = '';
</script>

<header>
  {#if eyebrow}<div class="page-eyebrow">{eyebrow}</div>{/if}
  <h1 class="page-title">{title}</h1>
  {#if subtitle}<p class="page-subtitle">{subtitle}</p>{/if}
</header>

<style>
  header { margin-bottom: 0; }
  .page-eyebrow {
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin-bottom: 12px;
  }
  .page-title {
    font-family: var(--serif);
    font-size: 44px;
    font-weight: 500;
    margin: 0 0 10px;
    color: var(--ink);
    letter-spacing: -0.01em;
    line-height: 1.02;
  }
  .page-subtitle {
    color: var(--ink-dim);
    margin: 0 0 30px;
    font-size: 15px;
    line-height: 1.55;
    max-width: 60ch;
  }
</style>
