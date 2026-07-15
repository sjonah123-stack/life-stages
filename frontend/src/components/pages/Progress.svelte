<script lang="ts">
  // Progress page: historical body-log charts, achievements grid, and
  // personal bests. Read-only — everything derives from data the rest
  // of the app already collects.
  import PageHeader from '../shared/PageHeader.svelte';
  import WeeklyReflectionSection from '../progress/WeeklyReflectionSection.svelte';
  import WealthTrendsSection from '../progress/WealthTrendsSection.svelte';
  import BodyTrendsSection from '../progress/BodyTrendsSection.svelte';
  import AchievementsSection from '../progress/AchievementsSection.svelte';
  import PersonalBestsSection from '../progress/PersonalBestsSection.svelte';
</script>

<section class="page">
  <PageHeader
    title="Progress"
    subtitle="Look back. What you've tracked compounds into a picture."
  />

  <WeeklyReflectionSection />
  <PersonalBestsSection />
  <WealthTrendsSection />
  <AchievementsSection />
  <BodyTrendsSection />
</section>

