<script lang="ts">
  import { WEALTHS } from '../../data/assessment';
  import WealthIcon from '../shared/WealthIcon.svelte';

  export let onStart: () => void;

  // Per-wealth color tokens for the tiny intro tiles.
  const TILE_COLORS: Record<string, { c1: string; c2: string }> = {
    time:      { c1: 'var(--future-3)', c2: 'var(--growth)' },
    social:    { c1: 'var(--love)',     c2: 'var(--accent)' },
    mental:    { c1: 'var(--growth)',   c2: 'var(--career)' },
    physical:  { c1: 'var(--health)',   c2: 'var(--career)' },
    financial: { c1: 'var(--money)',    c2: 'var(--accent)' },
  };
</script>

<div class="intro glass-tinted">
  <div class="wealth-grid">
    {#each WEALTHS as w}
      <div
        class="wealth-tile"
        data-wealth={w.key}
        style="--c1: {TILE_COLORS[w.key]?.c1 ?? 'var(--accent)'}; --c2: {TILE_COLORS[w.key]?.c2 ?? 'var(--future-3)'};"
      >
        <div class="tile-glyph"><WealthIcon key={w.key} size={20} /></div>
        <div class="name">{w.label}</div>
        <div class="desc">{w.description}</div>
      </div>
    {/each}
  </div>

  <div class="cta-row">
    <button class="cta" on:click={onStart}>
      <span>Take the 3-minute assessment</span>
      <span class="arrow">→</span>
    </button>
    <span class="cta-note">15 questions · self-report + your app activity</span>
  </div>
</div>

<style>
  .intro {
    --tint: var(--future-3);
    border-radius: 24px;
    padding: 30px 32px 32px;
  }
  @media (max-width: 540px) {
    .intro { padding: 22px; border-radius: 20px; }
  }

  .wealth-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 26px;
  }
  .wealth-tile {
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.4));
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    padding: 16px;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease;
  }
  .wealth-tile:hover { transform: translateY(-2px); }
  .wealth-tile::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--c1), var(--c2));
    border-radius: 16px 16px 0 0;
  }
  .tile-glyph {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3)),
      linear-gradient(135deg, var(--c1), var(--c2));
    background-blend-mode: overlay, normal;
    border: 1px solid rgba(255, 255, 255, 0.7);
    box-shadow:
      0 4px 12px -2px color-mix(in srgb, var(--c1) 35%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.7) inset;
    margin-bottom: 10px;
  }
  .tile-glyph span { font-size: 20px; line-height: 1; filter: saturate(1.15); }
  .name {
    font-weight: 800;
    color: var(--ink);
    font-size: 14px;
    letter-spacing: -0.01em;
  }
  .desc {
    color: var(--ink-dim);
    font-size: 12.5px;
    line-height: 1.45;
    margin-top: 4px;
  }
  .cta-row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .cta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, var(--accent), var(--future-3) 70%, var(--growth));
    color: white;
    border: none;
    border-radius: 14px;
    padding: 14px 26px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow:
      0 6px 20px -4px color-mix(in srgb, var(--accent) 45%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.3) inset;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    letter-spacing: -0.01em;
  }
  .cta:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 26px -4px color-mix(in srgb, var(--accent) 55%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.3) inset;
  }
  .cta .arrow {
    font-size: 18px;
    transition: transform 0.18s ease;
  }
  .cta:hover .arrow { transform: translateX(3px); }
  .cta-note { font-size: 12.5px; color: var(--ink-faint); }
</style>
