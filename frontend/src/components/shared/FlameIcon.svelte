<script lang="ts">
  // Small streak-flame line icon — replaces the 🔥 emoji on habit pills.
  // Inherits currentColor so it stays legible on both ink and terracotta.
  export let size = 12;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path
    d="M12 3c2 3-4.5 5.5-4.5 10a4.5 4.5 0 0 0 9 0c0-2.2-1.1-3.9-2.3-5.2-.3 1.2-1 2-1.7 2.3.7-2.3.7-4.8-.5-7.1z"
  />
</svg>
