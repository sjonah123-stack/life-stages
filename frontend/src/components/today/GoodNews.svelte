<script lang="ts">
  import { selectedAge } from '../../stores/slider';
  import { getStage } from '../../data';

  $: stage = getStage($selectedAge);
</script>

<div class="good-news glass-tinted" style="--tint: var(--money);">
  <div class="halo" aria-hidden="true"></div>
  <div class="good-news-emoji">☀️</div>
  <div class="good-news-content">
    <div class="eyebrow-modern">Good news</div>
    <div class="good-news-text">{stage.goodNews}</div>
  </div>
</div>

<style>
  .good-news {
    border-radius: 22px;
    padding: 24px 26px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
    height: 100%;
  }
  .halo {
    position: absolute;
    top: -40%;
    right: -20%;
    width: 60%;
    height: 130%;
    background: radial-gradient(circle, var(--money) 0%, transparent 65%);
    opacity: 0.25;
    filter: blur(10px);
    pointer-events: none;
  }
  .good-news-emoji {
    font-size: 36px;
    flex-shrink: 0;
    line-height: 1;
    filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--money) 40%, transparent));
    position: relative;
  }
  .good-news-content { flex: 1; position: relative; }
  .good-news-content .eyebrow-modern { margin-bottom: 10px; }
  .good-news-text {
    font-size: 16px;
    line-height: 1.55;
    color: var(--ink);
    font-weight: 500;
  }
</style>
