<script lang="ts">
  import { currentPage } from './lib/router';
  import { isBlankState } from './stores/personal';
  import { swipeNav, slideDirection } from './lib/swipe';
  import { motionDuration } from './lib/motion';
  import TopNav from './components/nav/TopNav.svelte';
  import WelcomeScreen from './components/shared/WelcomeScreen.svelte';
  import ToastHost from './components/shared/ToastHost.svelte';
  import Today from './components/pages/Today.svelte';
  import Journal from './components/pages/Journal.svelte';
  import Goals from './components/pages/Goals.svelte';
  import Finance from './components/pages/Finance.svelte';
  import Progress from './components/pages/Progress.svelte';
  import Settings from './components/pages/Settings.svelte';

  // Directional page slide: derived from the tab order, so it works the
  // same for swipes and nav-tab clicks. Settings (not a tab) gets 0 →
  // plain fade only.
  let prevPage = $currentPage;
  let direction: 1 | -1 | 0 = 0;
  $: {
    direction = slideDirection(prevPage, $currentPage);
    prevPage = $currentPage;
  }
</script>

<TopNav />

{#if $isBlankState}
  <main class="container"><WelcomeScreen /></main>
{:else}
  <main class="container" use:swipeNav>
    {#key $currentPage}
      <div
        class="page-slide"
        class:from-right={direction === 1}
        class:from-left={direction === -1}
        style="animation-duration: {motionDuration(250)}ms"
      >
        {#if $currentPage === 'today'}
          <Today />
        {:else if $currentPage === 'journal'}
          <Journal />
        {:else if $currentPage === 'goals'}
          <Goals />
        {:else if $currentPage === 'finance'}
          <Finance />
        {:else if $currentPage === 'progress'}
          <Progress />
        {:else if $currentPage === 'settings'}
          <Settings />
        {/if}
      </div>
    {/key}
  </main>
{/if}

<ToastHost />

<style>
  /* Directional slide for swipe/tab navigation. Composes with the global
     .page fade (app.css) on the same clock; direction 0 leaves only the
     fade. Duration is set inline via motionDuration() — 0ms under
     prefers-reduced-motion — with a media-query belt-and-braces below. */
  .page-slide.from-right {
    animation-name: slide-from-right;
    animation-timing-function: ease-out;
  }
  .page-slide.from-left {
    animation-name: slide-from-left;
    animation-timing-function: ease-out;
  }
  @keyframes slide-from-right {
    from { opacity: 0; transform: translateX(28px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slide-from-left {
    from { opacity: 0; transform: translateX(-28px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .page-slide { animation: none; }
  }
</style>
