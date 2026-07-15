<script lang="ts">
  // Personal-bests dashboard — stat cards showing peaks + longest streaks
  // across all the trackers. Everything is derived from existing stores
  // via personalBests in stores/achievements.ts.
  import { personalBests } from '../../stores/achievements';

  const fmtCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  function moodEmoji(avg: number | null): string {
    if (avg == null) return '—';
    if (avg < 1.75) return '😞';
    if (avg < 2.5) return '😕';
    if (avg < 3.5) return '😐';
    if (avg < 4.25) return '🙂';
    return '😄';
  }

  $: pb = $personalBests;

  // Build the visible stat list. Zero values are still surfaced (with
  // the muted color) so the page never feels empty.
  $: stats = [
    { key: 'journal-entries', label: 'Journal entries', value: pb.journalEntries.toLocaleString(), emoji: '📓' },
    { key: 'journal-streak', label: 'Longest weekly streak', value: pb.journalLongestStreakWeeks > 0 ? `${pb.journalLongestStreakWeeks} wks` : '—', emoji: '🔥' },
    { key: 'habit-streak', label: 'Best habit streak', value: pb.bestHabitStreakDays > 0 ? `${pb.bestHabitStreakDays} days` : '—', emoji: '✨' },
    { key: 'body-streak', label: 'Body-log streak', value: pb.bodyConsecutiveDays > 0 ? `${pb.bodyConsecutiveDays} days` : '—', emoji: '🌡️' },
    { key: 'mood-best', label: 'Best mood week (avg)', value: pb.bestMoodWeekAvg != null ? `${moodEmoji(pb.bestMoodWeekAvg)} ${pb.bestMoodWeekAvg.toFixed(1)}` : '—', emoji: '🌤️' },
    { key: 'books', label: 'Books logged', value: pb.booksTotal.toLocaleString(), emoji: '📚' },
    { key: 'milestones', label: 'Milestones completed', value: pb.milestonesCompleted.toLocaleString(), emoji: '🏁' },
    { key: 'nw-peak', label: 'Net-worth peak', value: pb.netWorthPeak > 0 ? fmtCurrency.format(pb.netWorthPeak) : '—', emoji: '📈' },
    { key: 'giving-year', label: 'Given this year', value: pb.givingThisYear > 0 ? fmtCurrency.format(pb.givingThisYear) : '—', emoji: '🤲' },
  ];
</script>

<section class="module-section">
  <h2>Personal bests</h2>
  <p class="sub">
    Peaks and longest streaks across every tracker. Derived from your data — no manual logging.
  </p>

  <div class="grid">
    {#each stats as s (s.key)}
      <div class="stat-card" class:empty={s.value === '—'}>
        <div class="stat-emoji">{s.emoji}</div>
        <div class="stat-value">{s.value}</div>
        <div class="stat-label">{s.label}</div>
      </div>
    {/each}
  </div>
</section>

<style>
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .sub { color: var(--ink-dim); margin: 0 0 16px; font-size: 14px; line-height: 1.5; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }
  .stat-card {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
  .stat-card.empty { opacity: 0.55; }
  .stat-emoji { font-size: 22px; line-height: 1; margin-bottom: 2px; }
  .stat-value {
    font-size: 20px;
    font-weight: 800;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
    line-height: 1.1;
  }
  .stat-label {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }
</style>
