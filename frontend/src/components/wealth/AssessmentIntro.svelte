<script lang="ts">
  import { WEALTHS } from '../../data/assessment';

  export let onStart: () => void;
</script>

<div class="intro">
  <h2>The 5 Types of Wealth</h2>
  <p class="lead">
    Money is one of five wealths. The others compound just as much over a lifetime — and the
    happiest people tend to be balanced across all of them. Take 3 minutes to see where you stand.
  </p>

  <div class="wealth-grid">
    {#each WEALTHS as w}
      <div class="wealth-tile" data-wealth={w.key}>
        <span class="emoji">{w.emoji}</span>
        <div class="name">{w.label}</div>
        <div class="desc">{w.description}</div>
      </div>
    {/each}
  </div>

  <div class="cta-row">
    <button class="cta" on:click={onStart}>Take the 3-minute assessment</button>
    <span class="cta-note">15 questions · self-report + your app activity</span>
  </div>
</div>

<style>
  .intro {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 28px 32px 32px;
    box-shadow: var(--shadow-sm);
    margin-top: 8px;
  }
  h2 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--future-3) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .lead {
    color: var(--ink-dim);
    font-size: 16px;
    line-height: 1.55;
    margin: 0 0 22px;
    max-width: 640px;
  }
  .wealth-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 22px;
  }
  .wealth-tile {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
  }
  .emoji { font-size: 26px; }
  .name {
    font-weight: 800;
    color: var(--ink);
    font-size: 14px;
    margin-top: 4px;
  }
  .desc {
    color: var(--ink-dim);
    font-size: 12px;
    line-height: 1.4;
    margin-top: 4px;
  }
  .cta-row {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }
  .cta {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 22px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(255, 140, 97, 0.32);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(255, 140, 97, 0.4);
  }
  .cta-note { font-size: 12px; color: var(--ink-faint); }
</style>
