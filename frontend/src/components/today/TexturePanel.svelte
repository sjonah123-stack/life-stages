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

<div class="texture-panel">
  <h3>{title}</h3>
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
    background: linear-gradient(135deg, rgba(255, 214, 165, 0.45), rgba(255, 107, 157, 0.18));
    border: 1px solid rgba(255, 140, 97, 0.22);
    border-radius: 18px;
    padding: 24px 28px;
    margin-bottom: 24px;
  }
  h3 {
    margin: 0 0 16px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent);
    font-weight: 700;
  }
  .texture-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 18px;
  }
  .texture-item { display: flex; align-items: center; gap: 12px; }
  .texture-emoji { font-size: 30px; filter: saturate(1.2); }
  .texture-num {
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.1;
  }
  .texture-desc {
    font-size: 12px;
    color: var(--ink-dim);
    margin-top: 2px;
    line-height: 1.3;
  }
</style>
