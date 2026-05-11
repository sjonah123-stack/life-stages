<script lang="ts">
  // Progress page: historical body-log charts, achievements grid, and
  // personal bests. Read-only — everything derives from data the rest
  // of the app already collects.
  import PageHeader from '../shared/PageHeader.svelte';
  import BodyTrendsSection from '../progress/BodyTrendsSection.svelte';
  import AchievementsSection from '../progress/AchievementsSection.svelte';
  import PersonalBestsSection from '../progress/PersonalBestsSection.svelte';
</script>

<section class="page">
  <PageHeader
    title="Progress"
    subtitle="Look back. What you've tracked compounds into a picture."
  />

  <PersonalBestsSection />
  <AchievementsSection />
  <BodyTrendsSection />
</section>

<style>
  .page { animation: fadeInPage 0.25s ease-out; }
  @keyframes fadeInPage {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
