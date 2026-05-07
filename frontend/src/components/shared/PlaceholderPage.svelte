<script lang="ts">
  import PageHeader from './PageHeader.svelte';

  export let title: string;
  export let subtitle: string;
  export let phase: number;
  export let items: string[] = [];
</script>

<section class="page">
  <PageHeader {title} {subtitle} />
  <div class="placeholder">
    <p>Coming in <strong>Phase {phase}</strong>. Will hold:</p>
    <ul>
      {#each items as item}<li>{item}</li>{/each}
    </ul>
  </div>
</section>

<style>
  .placeholder {
    background: var(--panel);
    border: 1px dashed var(--border);
    border-radius: 18px;
    padding: 24px 28px;
    color: var(--ink-dim);
    box-shadow: var(--shadow-sm);
  }
  .placeholder ul {
    margin: 12px 0 0;
    padding-left: 22px;
    line-height: 1.7;
  }
</style>
