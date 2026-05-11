<script lang="ts">
  // Quick body-log entry on Today. Sleep + weight + workout minutes. Each
  // field is optional so users can log just sleep some days, just weight
  // others. Same-date overwrites, but with a merge so a partial save
  // doesn't blank fields from earlier today.
  import { bodyEntries, latestBody, addBodyEntry, deleteBodyEntry } from '../../stores/body';
  import { formatDOB } from '../../utils';

  let expanded = false;
  let sleepInput = '';
  let weightInput = '';
  let workoutInput = '';
  let saving = false;
  let savedFlash = '';

  $: today = formatDOB(new Date());
  $: list = $bodyEntries;
  $: latest = $latestBody;
  // Today's existing entry (if any) so the form pre-fills.
  $: todayEntry = list.find((e) => e.date === today) ?? null;
  // Yesterday's entry for context (only show when no entry today).
  $: yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDOB(d);
  })();
  $: yesterdayEntry = list.find((e) => e.date === yesterdayStr) ?? null;

  // When the form expands, pre-fill from today's entry if it exists.
  $: if (expanded && todayEntry) {
    sleepInput = todayEntry.sleepHours != null ? String(todayEntry.sleepHours) : '';
    weightInput = todayEntry.weight != null ? String(todayEntry.weight) : '';
    workoutInput = todayEntry.workoutMinutes != null ? String(todayEntry.workoutMinutes) : '';
  }

  function open() {
    expanded = true;
    if (!todayEntry) {
      sleepInput = '';
      weightInput = '';
      workoutInput = '';
    }
  }

  function close() {
    expanded = false;
  }

  function save() {
    saving = true;
    const sleep = sleepInput ? parseFloat(sleepInput) : NaN;
    const weight = weightInput ? parseFloat(weightInput) : NaN;
    const workout = workoutInput ? parseFloat(workoutInput) : NaN;

    addBodyEntry({
      date: today,
      ...(Number.isFinite(sleep) && sleep >= 0 && sleep <= 24 ? { sleepHours: sleep } : {}),
      ...(Number.isFinite(weight) && weight > 0 ? { weight } : {}),
      ...(Number.isFinite(workout) && workout >= 0 ? { workoutMinutes: workout } : {}),
    });
    savedFlash = 'Logged ✓';
    setTimeout(() => { savedFlash = ''; }, 2400);
    saving = false;
    expanded = false;
  }

  function handleDelete() {
    if (!todayEntry) return;
    if (!confirm("Delete today's check-in?")) return;
    deleteBodyEntry(today);
  }

  // Compact display of an entry's filled fields.
  function describe(e: { weight?: number; sleepHours?: number; workoutMinutes?: number } | null): string {
    if (!e) return '';
    const parts: string[] = [];
    if (e.sleepHours != null) parts.push(`${e.sleepHours}h sleep`);
    if (e.weight != null) parts.push(`${e.weight} lb`);
    if (e.workoutMinutes != null) parts.push(`${e.workoutMinutes} min moved`);
    return parts.join(' · ');
  }
</script>

<section class="checkin-card glass">
  <div class="head">
    <div class="head-left">
      <div class="eyebrow">DAILY CHECK-IN</div>
      <div class="head-line">
        {#if todayEntry}
          <strong>Today:</strong> {describe(todayEntry) || 'logged'}
          {#if savedFlash}<span class="flash">{savedFlash}</span>{/if}
        {:else if yesterdayEntry}
          <span class="muted">Yesterday: {describe(yesterdayEntry)}</span>
        {:else}
          <span class="muted">How was last night? How are you moving today?</span>
        {/if}
      </div>
    </div>
    {#if !expanded}
      <button class="btn primary" type="button" on:click={open}>
        {todayEntry ? 'Update' : 'Log'}
      </button>
    {/if}
  </div>

  {#if expanded}
    <form class="form" on:submit|preventDefault={save}>
      <div class="form-row">
        <label class="field">
          <span>Sleep (hours)</span>
          <input
            type="number"
            inputmode="decimal"
            step="0.25"
            min="0"
            max="24"
            bind:value={sleepInput}
            placeholder="7.5"
          />
        </label>
        <label class="field">
          <span>Weight (lb)</span>
          <input
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            bind:value={weightInput}
            placeholder="—"
          />
        </label>
        <label class="field">
          <span>Workout (min)</span>
          <input
            type="number"
            inputmode="numeric"
            min="0"
            bind:value={workoutInput}
            placeholder="30"
          />
        </label>
      </div>
      <div class="form-actions">
        {#if todayEntry}
          <button class="btn ghost danger" type="button" on:click={handleDelete}>Delete today</button>
        {/if}
        <button class="btn ghost" type="button" on:click={close}>Cancel</button>
        <button class="btn primary" type="submit" disabled={saving}>Save</button>
      </div>
    </form>
  {/if}
</section>

<style>
  .checkin-card {
    border-radius: 18px;
    padding: 16px 20px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .checkin-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, var(--health), var(--career));
    border-radius: 2px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  .head-left { flex: 1; min-width: 0; }
  .eyebrow {
    font-size: 10px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-weight: 700;
    margin-bottom: 4px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .eyebrow::before {
    content: '';
    width: 14px;
    height: 1.5px;
    background: linear-gradient(90deg, var(--health), transparent);
    border-radius: 1px;
  }
  .head-line {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.4;
  }
  .head-line strong { font-weight: 700; }
  .head-line .muted { color: var(--ink-dim); }
  .head-line .flash {
    margin-left: 8px;
    color: var(--health);
    font-weight: 700;
    font-size: 12px;
  }

  .btn {
    border-radius: 10px;
    padding: 8px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn.primary {
    background: linear-gradient(135deg, var(--health), var(--career));
    color: white;
    border: none;
    box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--health) 40%, transparent);
  }
  .btn.primary:hover { transform: translateY(-1px); }
  .btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn.ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-dim);
  }
  .btn.ghost:hover { border-color: var(--ink-dim); color: var(--ink); }
  .btn.ghost.danger:hover { border-color: var(--love); color: var(--love); }

  .form {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed var(--border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .form-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  @media (max-width: 540px) {
    .form-row { grid-template-columns: 1fr; }
  }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field span {
    font-size: 10px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .field input {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--panel-warm);
    font-variant-numeric: tabular-nums;
  }
  .field input:focus {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
    border-color: var(--accent);
  }
  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
</style>
