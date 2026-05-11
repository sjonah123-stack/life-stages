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

  $: greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Tonight';
  })();

  $: dobLine = $birthdate ? `Anchored to ${prettyDOB($birthdate)}` : 'One extraordinary life';
</script>

<section class="page with-atmosphere">
  <header class="hero-header">
    <div class="eyebrow-modern">{dobLine}</div>
    <h1>
      <span class="greeting">{greeting}.</span>
      <span class="headline">Walk the years.</span>
    </h1>
    <p class="subtitle">
      Every age is a chapter you can step into. Slide forward to see what's coming —
      backward to feel what's already yours.
    </p>
  </header>

  <AnniversaryCard />

  <div class="hero-stack">
    <AgeSlider />
    <StatRow />
  </div>

  <DailyCheckInCard />

  <div class="texture-row">
    <TexturePanel />
    <GoodNews />
  </div>

  <DimensionCards />

  <TodayWealth />
</section>

<style>
  /* Page-level rhythm. The hero header gets the most breathing room, then
     gradually tightens. The atmosphere class on .page produces the drifting
     orbs in the background. */
  .hero-header {
    margin-bottom: 32px;
  }
  .hero-header h1 {
    font-size: clamp(34px, 8vw, 64px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.0;
    margin: 14px 0 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hero-header .greeting {
    color: var(--ink);
    opacity: 0.92;
  }
  .hero-header .headline {
    background: linear-gradient(120deg, var(--accent) 0%, var(--future-3) 60%, var(--growth) 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: shimmer 8s ease-in-out infinite alternate;
  }
  @keyframes shimmer {
    from { background-position: 0% 50%; }
    to   { background-position: 100% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-header .headline { animation: none; }
  }

  .subtitle {
    color: var(--ink-dim);
    margin: 0;
    font-size: clamp(15px, 2.6vw, 18px);
    line-height: 1.55;
    max-width: 580px;
  }

  /* The slider + numbers belong together visually — wrap them in a stack
     with a small gap so they read as one feature. */
  .hero-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  /* Two-up below the hero: texture and good-news side-by-side on wide
     viewports, stacked on narrow. */
  .texture-row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  @media (max-width: 820px) {
    .texture-row { grid-template-columns: 1fr; }
  }

  @media (max-width: 480px) {
    .hero-header { margin-bottom: 22px; }
    .hero-header h1 { margin: 10px 0 14px; }
  }
</style>
