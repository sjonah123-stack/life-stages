<script lang="ts">
  import { currentPage } from './lib/router';
  import TopNav from './components/nav/TopNav.svelte';
  import Today from './components/pages/Today.svelte';
  import Journal from './components/pages/Journal.svelte';
  import People from './components/pages/People.svelte';
  import Places from './components/pages/Places.svelte';
  import Reading from './components/pages/Reading.svelte';
  import Goals from './components/pages/Goals.svelte';
  import Settings from './components/pages/Settings.svelte';
</script>

<TopNav />
<main class="container">
  {#if $currentPage === 'today'}
    <Today />
  {:else if $currentPage === 'journal'}
    <Journal />
  {:else if $currentPage === 'people'}
    <People />
  {:else if $currentPage === 'places'}
    <Places />
  {:else if $currentPage === 'reading'}
    <Reading />
  {:else if $currentPage === 'goals'}
    <Goals />
  {:else if $currentPage === 'settings'}
    <Settings />
  {/if}
</main>
