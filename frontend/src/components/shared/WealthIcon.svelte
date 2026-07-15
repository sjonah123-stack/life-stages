<script lang="ts">
  // Minimal line icons for the five wealth types — hand-rolled SVG in the
  // WealthRadar tradition (no icon library). Strokes inherit currentColor
  // so each site tints via CSS. `x`/`y` allow embedding inside an existing
  // <svg> (nested svg elements are valid SVG) — used by the radar labels.
  import type { WealthKey } from '../../types';

  export let key: WealthKey;
  export let size = 18;
  export let x: number | undefined = undefined;
  export let y: number | undefined = undefined;
</script>

<svg
  {x}
  {y}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if key === 'time'}
    <!-- Hourglass -->
    <path d="M6.5 3.5h11" />
    <path d="M6.5 20.5h11" />
    <path d="M8 3.5c0 4.2 3.2 4.8 4 7.5-.8 2.7-4 3.3-4 7.5" />
    <path d="M16 3.5c0 4.2-3.2 4.8-4 7.5.8 2.7 4 3.3 4 7.5" />
  {:else if key === 'social'}
    <!-- Two people -->
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
    <path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.9" />
    <path d="M17.2 14.9c2 .6 3.3 2.2 3.3 4.6" />
  {:else if key === 'mental'}
    <!-- Head with a thought spark -->
    <path d="M13.5 21v-2.5h2.2c.8 0 1.4-.6 1.4-1.4v-2.3H19l-1.5-3.2A6.8 6.8 0 1 0 8 18.2V21" />
    <circle cx="11" cy="10" r="2.4" />
  {:else if key === 'physical'}
    <!-- Pulse line -->
    <path d="M3 12.5h4l2.5-6.5 4.5 12 2.5-5.5H21" />
  {:else}
    <!-- Coin -->
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.8v8.4" />
    <path d="M14.6 9.4c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.7.9-2.7 2.1s1 1.7 2.7 2c1.7.3 2.7.8 2.7 2s-1.2 2.1-2.7 2.1c-1.1 0-2.1-.5-2.6-1.4" />
  {/if}
</svg>
