<script lang="ts">
  import PlaceholderPage from '../shared/PlaceholderPage.svelte';
</script>

<PlaceholderPage
  title="Your journal"
  subtitle="Composer at top, entry feed below, calendar view collapsible at the bottom."
  phase={8}
  items={[
    'Streak counter + "this week last year" anniversary banner',
    'Composer (date picker, mood, prompt chip, photo, word count, auto-save)',
    'Search input + year filter + mood filter chips',
    'Entry feed (cards with photo, date, age pill, edit/delete)',
    'Weeks-of-possibility calendar grid (4,680 squares, collapsible)',
    'Future-self letters at 40 / 60 / 80',
    'Export / import journal (JSON)',
  ]}
/>
