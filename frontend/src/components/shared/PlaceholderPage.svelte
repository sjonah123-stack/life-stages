<script lang="ts">
  export let title: string;
  export let subtitle: string;
  export let phase: number;
  export let items: string[] = [];
</script>

<section class="page">
  <h1 class="page-title">{title}</h1>
  <p class="page-subtitle">{subtitle}</p>
  <div class="placeholder">
    <p>Coming in <strong>Phase {phase}</strong>. Will hold:</p>
    <ul>
      {#each items as item}<li>{item}</li>{/each}
    </ul>
  </div>
</section>

<style>
  .page {
    animation: fadeInPage 0.25s ease-out;
  }
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
