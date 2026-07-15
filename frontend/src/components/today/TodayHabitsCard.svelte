<script lang="ts">
  // Compact one-tap habit strip for the Today page — this is where the
  // daily loop actually happens. Full management (add/delete/chain) stays
  // on Goals; this card is check-off only, with the same celebration
  // path as HabitsSection.
  import { activeHabits, checkKeys, streakFor } from '../../stores/habits';
  import { toggleHabitWithCelebration } from '../../lib/habit-celebration';
  import { navigate } from '../../lib/router';
  import { formatDOB } from '../../utils';

  $: today = formatDOB(new Date());
  $: list = $activeHabits;
  $: keys = $checkKeys;
  $: doneCount = list.filter((h) => keys.has(`${h.id}|${today}`)).length;
</script>

{#if list.length > 0}
  <section class="card glass">
    <div class="head">
      <div class="eyebrow-modern">Daily habits</div>
      <div class="head-right">
        <span class="tally" class:complete={doneCount === list.length}>
          {doneCount}/{list.length} today
        </span>
        <button class="manage" type="button" on:click={() => navigate('goals')}>
          Manage →
        </button>
      </div>
    </div>
    <div class="pills">
      {#each list as h (h.id)}
        {@const checked = keys.has(`${h.id}|${today}`)}
        {@const streak = streakFor(h.id, keys)}
        <button
          class="pill"
          class:checked
          type="button"
          aria-pressed={checked}
          on:click={(e) => toggleHabitWithCelebration(h, checked, e.currentTarget)}
        >
          <span class="pill-mark">{checked ? '✓' : ''}</span>
          {#if h.emoji}<span class="pill-emoji">{h.emoji}</span>{/if}
          <span class="pill-label">{h.label}</span>
          {#if streak > 0}<span class="pill-streak">🔥 {streak}</span>{/if}
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .card {
    padding: 22px 26px;
    margin-bottom: 24px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .head-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .tally {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .tally.complete { color: var(--accent); }
  .manage {
    background: none;
    border: none;
    color: var(--ink-faint);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 6px;
    transition: color 0.15s;
  }
  .manage:hover { color: var(--accent); }

  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px 9px 10px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .pill:hover { border-color: var(--accent); }
  .pill.checked {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg-1);
  }
  .pill-mark {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    background: var(--panel);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    color: var(--accent);
    flex-shrink: 0;
  }
  .pill.checked .pill-mark {
    border-color: color-mix(in srgb, var(--bg-1) 55%, transparent);
    background: transparent;
    color: var(--bg-1);
    animation: check-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .pill.checked .pill-mark { animation: none; }
  }
  .pill-emoji { font-size: 15px; }
  .pill-label {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pill-streak {
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
