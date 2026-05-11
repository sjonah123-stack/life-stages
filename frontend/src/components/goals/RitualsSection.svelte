<script lang="ts">
  // Rituals you want to keep — moved here from the People page so all the
  // "things I'm aiming toward / coming back to" content lives under Goals.
  // The next-occurrence date is the new piece: pick a target date when you
  // add the ritual, hit "Done" when you complete one, and the next date
  // rolls forward by 365 / frequency days.
  import { rituals } from '../../stores/collections';
  import { todayAge } from '../../stores/personal';
  import { personalHorizon } from '../../stores/derived';
  import { FREQ_LABEL } from '../../config';
  import { parseDOB, formatDOB, daysBetween } from '../../utils';
  import type { Ritual } from '../../types';

  let nameInput = '';
  let frequencyInput: 1 | 2 | 4 | 12 = 1;
  let nextDateInput = '';

  $: yearsAhead = $todayAge >= 0 ? Math.max(0, $personalHorizon - $todayAge) : 0;

  function addRitual(e: SubmitEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    rituals.update((arr) => [
      ...arr,
      {
        name: nameInput.trim(),
        frequency: frequencyInput,
        ...(nextDateInput ? { nextDate: nextDateInput } : {}),
      },
    ]);
    nameInput = '';
    frequencyInput = 1;
    nextDateInput = '';
  }

  function removeRitual(i: number) {
    rituals.update((arr) => arr.filter((_, idx) => idx !== i));
  }

  // Roll the next-date forward by floor(365 / frequency) days. Calendar
  // quirks (Thanksgiving moves dates each year) aren't handled — user can
  // edit manually if needed; this just gives a sensible default for the
  // common case.
  function markDone(i: number) {
    rituals.update((arr) =>
      arr.map((r, idx) => {
        if (idx !== i) return r;
        const cadenceDays = Math.floor(365 / r.frequency);
        const base = r.nextDate ? parseDOB(r.nextDate, true) : new Date();
        const anchor = base ?? new Date();
        const next = new Date(anchor);
        next.setDate(anchor.getDate() + cadenceDays);
        return { ...r, nextDate: formatDOB(next) };
      }),
    );
  }

  // Computed remaining lifetime occurrences (existing semantic).
  function remaining(r: Ritual): number {
    return Math.round(yearsAhead * (r.frequency || 1));
  }

  // Days-until / overdue label. Today returns "today"; future returns
  // "in N days"; past returns "N days ago (update?)".
  function untilLabel(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    const d = parseDOB(dateStr, true);
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delta = daysBetween(today, d);
    if (delta === 0) return 'today';
    if (delta > 0) {
      if (delta === 1) return 'tomorrow';
      if (delta < 14) return `in ${delta} days`;
      if (delta < 60) return `in ${Math.round(delta / 7)} weeks`;
      if (delta < 730) return `in ${Math.round(delta / 30)} months`;
      return `in ${Math.round(delta / 365)} years`;
    }
    const ago = -delta;
    if (ago === 1) return 'yesterday';
    if (ago < 14) return `${ago} days ago`;
    if (ago < 60) return `${Math.round(ago / 7)} weeks ago`;
    if (ago < 730) return `${Math.round(ago / 30)} months ago`;
    return `${Math.round(ago / 365)} years ago`;
  }

  function isOverdue(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    const d = parseDOB(dateStr, true);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return daysBetween(today, d) < 0;
  }

  // Date-picker min: today. No max — rituals can be planned years out.
  $: today = formatDOB(new Date());

  function fmtNice(dateStr: string): string {
    const d = parseDOB(dateStr, true);
    if (!d) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
</script>

<section class="module-section">
  <h2>Rituals worth keeping</h2>
  <p class="sub">
    Annual things you want to come back to — Thanksgiving with grandma, a summer trip, your birthday
    tradition. Add a date for the next one and we'll show you when it's coming.
  </p>
  <div class="module-stats">
    <span><span class="stat-num">{$rituals.length}</span>{$rituals.length === 1 ? 'ritual' : 'rituals'} worth keeping</span>
  </div>

  <div class="rituals-list">
    {#if $rituals.length === 0}
      <div class="empty">
        Add one. Even a small annual thing — a hike, a dinner, a phone call — becomes deeply
        meaningful when you can count remaining occurrences.
      </div>
    {:else}
      {#each $rituals as r, i (r.name + i)}
        {@const until = untilLabel(r.nextDate)}
        {@const overdue = isOverdue(r.nextDate)}
        <div class="ritual-row" class:overdue>
          <div class="ritual-info">
            <div class="ritual-name">{r.name}</div>
            <div class="ritual-meta">
              {FREQ_LABEL[r.frequency] ?? 'yearly'}
              {#if r.nextDate}
                · next: {fmtNice(r.nextDate)}{#if until} ({until}){/if}
              {/if}
            </div>
          </div>
          <div class="ritual-actions">
            {#if r.nextDate}
              <button class="btn done" type="button" on:click={() => markDone(i)} title="Mark done and advance to next">
                ✓ Done
              </button>
            {/if}
            <span class="ritual-remaining" title="Approximate remaining occurrences over your lifetime">
              ~{remaining(r)} more
            </span>
            <button class="remove" on:click={() => removeRitual(i)} title="Remove">×</button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <form class="entry-form" on:submit={addRitual}>
    <input type="text" bind:value={nameInput} placeholder="Ritual (e.g. Thanksgiving with family)" maxlength={60} />
    <select bind:value={frequencyInput}>
      <option value={1}>Yearly</option>
      <option value={2}>Twice a year</option>
      <option value={4}>Quarterly</option>
      <option value={12}>Monthly</option>
    </select>
    <input type="date" bind:value={nextDateInput} min={today} title="Next occurrence (optional)" />
    <button type="submit">Add</button>
  </form>
</section>

<style>
  .module-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 26px 28px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-sm);
  }
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
  .sub { color: var(--ink-dim); margin: 0 0 16px; font-size: 14px; line-height: 1.5; }
  .module-stats {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    color: var(--ink-dim);
    font-size: 13px;
    font-weight: 600;
  }
  .stat-num {
    color: var(--accent);
    font-weight: 700;
    font-size: 18px;
    margin-right: 4px;
  }
  .rituals-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .empty { color: var(--ink-faint); font-size: 13px; font-style: italic; }

  .ritual-row {
    display: flex;
    gap: 14px;
    padding: 12px 14px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  .ritual-row.overdue {
    background: linear-gradient(135deg, rgba(255, 107, 157, 0.06), rgba(255, 140, 97, 0.04));
    border-color: rgba(255, 107, 157, 0.3);
  }
  .ritual-info { flex: 1; min-width: 0; }
  .ritual-name { font-weight: 700; color: var(--ink); font-size: 15px; }
  .ritual-meta { color: var(--ink-dim); font-size: 12px; margin-top: 2px; }

  .ritual-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }
  .btn.done {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 5px 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-dim);
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn.done:hover {
    border-color: var(--health);
    color: var(--health);
  }
  .ritual-remaining {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    color: white;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .remove {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .remove:hover { color: var(--love); }

  .entry-form {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .entry-form input[type='text'],
  .entry-form input[type='date'],
  .entry-form select {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    min-height: 38px;
  }
  .entry-form input[type='text'] { flex: 1; min-width: 200px; }
  .entry-form input[type='date'] { min-width: 150px; }
  .entry-form button {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 9px 18px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
