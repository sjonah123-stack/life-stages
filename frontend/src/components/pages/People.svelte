<script lang="ts">
  import PageHeader from '../shared/PageHeader.svelte';
  import PeopleSection from '../people/PeopleSection.svelte';
  import RitualsSection from '../people/RitualsSection.svelte';
</script>

<section class="page">
  <PageHeader
    title="People"
    subtitle="Track the people who shape your life and the conversations worth remembering. Click any person to log a chat."
  />
  <PeopleSection />
  <RitualsSection />
</section>
