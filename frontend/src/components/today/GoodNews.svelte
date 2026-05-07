<script lang="ts">
  import { selectedAge } from '../../stores/slider';
  import { getStage } from '../../data';

  $: stage = getStage($selectedAge);
</script>

<div class="good-news">
  <div class="good-news-emoji">☀️</div>
  <div class="good-news-content">
    <div class="good-news-label">Good news</div>
    <div class="good-news-text">{stage.goodNews}</div>
  </div>
</div>

<style>
  .good-news {
    background: linear-gradient(135deg, #FFF3E0, #FFE0EC);
    border: 1px solid rgba(255, 140, 97, 0.18);
    border-radius: 16px;
    padding: 22px 26px;
    margin-bottom: 24px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }
  .good-news-emoji { font-size: 32px; flex-shrink: 0; }
  .good-news-content { flex: 1; }
  .good-news-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 6px;
  }
  .good-news-text {
    font-size: 16px;
    line-height: 1.55;
    color: var(--ink);
  }
</style>
