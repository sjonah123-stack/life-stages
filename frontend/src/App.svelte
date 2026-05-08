<script lang="ts">
  import { currentPage } from './lib/router';
  import { isBlankState } from './stores/personal';
  import TopNav from './components/nav/TopNav.svelte';
  import WelcomeScreen from './components/shared/WelcomeScreen.svelte';
  import Today from './components/pages/Today.svelte';
  import Journal from './components/pages/Journal.svelte';
  import People from './components/pages/People.svelte';
  import Reading from './components/pages/Reading.svelte';
  import Goals from './components/pages/Goals.svelte';
  import Finance from './components/pages/Finance.svelte';
  import Settings from './components/pages/Settings.svelte';
</script>

<TopNav />

{#if $isBlankState}
  <main class="container"><WelcomeScreen /></main>
{:else}
  <main class="container">
    {#if $currentPage === 'today'}
      <Today />
    {:else if $currentPage === 'journal'}
      <Journal />
    {:else if $currentPage === 'people'}
      <People />
    {:else if $currentPage === 'reading'}
      <Reading />
    {:else if $currentPage === 'goals'}
      <Goals />
    {:else if $currentPage === 'finance'}
      <Finance />
    {:else if $currentPage === 'settings'}
      <Settings />
    {/if}
  </main>
{/if}
