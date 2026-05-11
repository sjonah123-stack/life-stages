<script lang="ts">
  import { selectedAge, isToday, isPast } from '../../stores/slider';
  import { personalHorizon } from '../../stores/derived';
  import { formatNum } from '../../utils';

  $: age = $selectedAge;
  $: horizon = $personalHorizon;
  $: aheadYears = Math.max(0, horizon - age);

  $: title =
    $isPast
      ? "What you'd already gathered by then"
      : $isToday
        ? "What's still ahead from right now"
        : "What's still ahead at this age";

  $: items = $isPast
    ? [
        { emoji: '🌅', num: age * 365, desc: 'sunrises witnessed' },
        { emoji: '📚', num: Math.max(0, age - 6) * 12, desc: 'books finished, give or take' },
        { emoji: '🎵', num: age * 365 * 1.5, desc: 'songs heard for the first time' },
        { emoji: '😄', num: age * 365 * 15, desc: 'belly laughs (humans avg ~15/day)' },
      ]
    : [
        { emoji: '🌄', num: aheadYears * 365, desc: 'mornings still to come' },
        { emoji: '📅', num: aheadYears * 52, desc: 'weekends to fill' },
        { emoji: '🍂', num: aheadYears * 4, desc: 'season changes ahead' },
        { emoji: '🎂', num: aheadYears, desc: 'birthday cakes still to blow out' },
      ];
</script>

<div class="texture-panel glass-tinted" style="--tint: var(--love);">
  <div class="eyebrow-modern">{title}</div>
  <div class="texture-grid">
    {#each items as it}
      <div class="texture-item">
        <div class="texture-emoji">{it.emoji}</div>
        <div>
          <div class="texture-num">~{formatNum(it.num)}</div>
          <div class="texture-desc">{it.desc}</div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .texture-panel {
    border-radius: 22px;
    padding: 22px 26px 24px;
    height: 100%;
  }
  .eyebrow-modern { margin-bottom: 18px; }
  .texture-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px 22px;
  }
  @media (max-width: 480px) {
    .texture-grid { grid-template-columns: 1fr; gap: 14px; }
  }
  .texture-item {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .texture-emoji {
    font-size: 30px;
    filter: saturate(1.15) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
    flex-shrink: 0;
  }
  .texture-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--ink);
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .texture-desc {
    font-size: 12.5px;
    color: var(--ink-dim);
    margin-top: 3px;
    line-height: 1.35;
  }
</style>
