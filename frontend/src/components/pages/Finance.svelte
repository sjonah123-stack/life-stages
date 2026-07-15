<script lang="ts">
  import PageHeader from '../shared/PageHeader.svelte';
  import NetWorthSection from '../finance/NetWorthSection.svelte';
  import SavingsSection from '../finance/SavingsSection.svelte';
  import GivingSection from '../finance/GivingSection.svelte';
</script>

<section class="page">
  <PageHeader
    title="Your finances"
    subtitle="Track what you have, what you're saving, and what you're giving back."
  />

  <div class="stack">
    <NetWorthSection />
    <SavingsSection />
    <GivingSection />
  </div>

  <p class="privacy">
    Stored privately on your device + your Firebase account. Never shared.
  </p>
</section>

<style>
  /* Section spacing comes from the shared .module-section margin. */
  .stack { margin-top: 8px; }
  .privacy {
    margin-top: 8px;
    text-align: center;
    color: var(--ink-faint);
    font-size: 12px;
    font-style: italic;
  }
</style>
