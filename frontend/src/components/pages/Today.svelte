<script lang="ts">
  import { prettyDOB } from '../../utils';
  import { birthdate } from '../../stores/personal';
  import AgeSlider from '../today/AgeSlider.svelte';
  import StatRow from '../today/StatRow.svelte';
  import TexturePanel from '../today/TexturePanel.svelte';
  import DimensionCards from '../today/DimensionCards.svelte';
  import GoodNews from '../today/GoodNews.svelte';
  import TodayWealth from '../today/TodayWealth.svelte';
  import AnniversaryCard from '../today/AnniversaryCard.svelte';
  import DailyCheckInCard from '../today/DailyCheckInCard.svelte';

  $: subtitle = $birthdate
    ? `Slide through the years ahead. Anchored to ${prettyDOB($birthdate)} — every age is yours to walk through.`
    : 'Slide through the years ahead. Each one is yours to shape.';
</script>

<section class="page">
  <header>
    <h1>Your one extraordinary life</h1>
    <p class="subtitle">{subtitle}</p>
  </header>

  <AnniversaryCard />
  <DailyCheckInCard />
  <AgeSlider />
  <StatRow />
  <TexturePanel />
  <DimensionCards />
  <GoodNews />
  <TodayWealth />
</section>

<style>
  .page { animation: fadeInPage 0.25s ease-out; }
  @keyframes fadeInPage {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  header { margin-bottom: 8px; }
  header h1 {
    /* clamp keeps the hero responsive: small phones get 28px,
       desktops cap at the original 48px. */
    font-size: clamp(28px, 7vw, 48px);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.05;
    margin: 0 0 12px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--future-3) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .subtitle {
    color: var(--ink-dim);
    margin: 0 0 24px;
    font-size: clamp(14px, 3vw, 17px);
    line-height: 1.55;
    max-width: 640px;
  }
  @media (max-width: 480px) {
    .subtitle { margin: 0 0 16px; }
  }
</style>
