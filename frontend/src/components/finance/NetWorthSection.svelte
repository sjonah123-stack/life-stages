<script lang="ts">
  import { tick } from 'svelte';
  import {
    netWorthEntries,
    latestNetWorth,
    addNetWorthEntry,
    deleteNetWorthEntry,
  } from '../../stores/financial';
  import { birthdate } from '../../stores/personal';
  import { formatDOB } from '../../utils';
  import NetWorthSparkline from './NetWorthSparkline.svelte';

  // Form state
  let formOpen = false;
  let dateInput = formatDOB(new Date());
  let amountInput = '';
  let noteInput = '';
  let amountEl: HTMLInputElement | null = null;
  let formError = '';
  let showAllEntries = false;

  $: list = $netWorthEntries;
  $: latest = $latestNetWorth;
  // Delta = latest minus the second-most-recent entry. Null when fewer than 2.
  $: delta = list.length >= 2 ? list[0].amount - list[1].amount : null;

  $: today = formatDOB(new Date());
  $: earliestDate = $birthdate ? formatDOB($birthdate) : '1900-01-01';

  $: visibleEntries = showAllEntries ? list : list.slice(0, 6);

  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  function fmtSigned(n: number): string {
    return (n >= 0 ? '+' : '−') + fmt.format(Math.abs(n));
  }

  async function openForm() {
    formError = '';
    formOpen = true;
    dateInput = formatDOB(new Date());
    amountInput = '';
    noteInput = '';
    await tick();
    amountEl?.focus();
  }

  function closeForm() {
    formOpen = false;
    formError = '';
  }

  function submit() {
    const amount = parseFloat(amountInput.replace(/[$,\s]/g, ''));
    if (!Number.isFinite(amount)) {
      formError = 'Enter a number.';
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      formError = 'Pick a valid date.';
      return;
    }
    addNetWorthEntry({
      date: dateInput,
      amount,
      ...(noteInput.trim() ? { note: noteInput.trim() } : {}),
    });
    closeForm();
  }

  function handleDelete(date: string) {
    if (!confirm(`Delete the check-in from ${date}?`)) return;
    deleteNetWorthEntry(date);
  }
</script>

<section class="nw-section">
  <header>
    <div class="eyebrow">NET WORTH</div>
    <h2>{latest ? fmt.format(latest.amount) : 'Net worth tracker'}</h2>
    {#if latest && delta !== null}
      <div class="delta" class:positive={delta >= 0} class:negative={delta < 0}>
        {fmtSigned(delta)} since {list[1].date}
      </div>
    {:else if latest}
      <div class="meta">As of {latest.date}</div>
    {:else}
      <p class="empty-prose">
        Track your total net worth with monthly check-ins. The trend matters more than any single number.
      </p>
    {/if}
  </header>

  {#if list.length > 0}
    <NetWorthSparkline entries={list} />
  {/if}

  <div class="actions">
    {#if !formOpen}
      <button class="btn primary" type="button" on:click={openForm}>
        + {list.length === 0 ? 'Add your first check-in' : 'Add check-in'}
      </button>
    {/if}
  </div>

  {#if formOpen}
    <form class="form" on:submit|preventDefault={submit}>
      <div class="form-row">
        <label class="field">
          <span>Date</span>
          <input type="date" bind:value={dateInput} min={earliestDate} max={today} required />
        </label>
        <label class="field">
          <span>Amount (USD)</span>
          <input
            type="text"
            inputmode="decimal"
            bind:value={amountInput}
            bind:this={amountEl}
            placeholder="48200"
            required
          />
        </label>
      </div>
      <label class="field full">
        <span>Note (optional)</span>
        <input
          type="text"
          bind:value={noteInput}
          placeholder="What changed this month?"
          maxlength={120}
        />
      </label>
      {#if formError}
        <div class="form-error" role="alert">{formError}</div>
      {/if}
      <div class="form-actions">
        <button class="btn ghost" type="button" on:click={closeForm}>Cancel</button>
        <button class="btn primary" type="submit">Save check-in</button>
      </div>
    </form>
  {/if}

  {#if list.length > 0}
    <div class="entries">
      <div class="entries-head">
        <span class="entries-label">Recent check-ins</span>
        {#if list.length > 6}
          <button class="link-btn" type="button" on:click={() => (showAllEntries = !showAllEntries)}>
            {showAllEntries ? 'Show fewer' : `Show all (${list.length})`}
          </button>
        {/if}
      </div>
      <ul>
        {#each visibleEntries as e (e.date)}
          <li>
            <span class="entry-date">{e.date}</span>
            <span class="entry-amount">{fmt.format(e.amount)}</span>
            {#if e.note}
              <span class="entry-note">{e.note}</span>
            {/if}
            <button
              class="entry-delete"
              type="button"
              aria-label="Delete check-in from {e.date}"
              on:click={() => handleDelete(e.date)}
            >×</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  .nw-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 22px 26px;
    box-shadow: var(--shadow-sm);
  }
  header { margin-bottom: 18px; }
  .eyebrow {
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    margin-bottom: 6px;
  }
  h2 {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 0 0 6px;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .delta {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .delta.positive { color: var(--health); }
  .delta.negative { color: var(--love); }
  .meta {
    font-size: 13px;
    color: var(--ink-dim);
  }
  .empty-prose {
    color: var(--ink-dim);
    font-size: 15px;
    line-height: 1.55;
    margin: 8px 0 0;
    max-width: 540px;
  }
  .actions { margin: 16px 0 0; }
  .btn {
    border-radius: 10px;
    padding: 9px 16px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn.primary {
    background: var(--accent);
    color: white;
    border: none;
    box-shadow: 0 2px 8px rgba(255, 140, 97, 0.25);
  }
  .btn.primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255, 140, 97, 0.35); }
  .btn.ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-dim);
  }
  .btn.ghost:hover { color: var(--ink); border-color: var(--ink-dim); }

  .form {
    margin-top: 16px;
    padding: 16px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) {
    .form-row { grid-template-columns: 1fr; }
  }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field span {
    font-size: 11px;
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
    background: var(--panel);
  }
  .field input:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }
  .form-error {
    color: var(--love);
    font-size: 13px;
    background: rgba(255, 107, 157, 0.08);
    border: 1px solid rgba(255, 107, 157, 0.3);
    border-radius: 8px;
    padding: 8px 12px;
  }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; }

  .entries { margin-top: 20px; }
  .entries-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .entries-label {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .link-btn:hover { text-decoration: underline; }
  .entries ul { list-style: none; margin: 0; padding: 0; }
  .entries li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .entries li:last-child { border-bottom: none; }
  .entry-date { color: var(--ink-dim); font-variant-numeric: tabular-nums; min-width: 90px; }
  .entry-amount { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ink); min-width: 90px; }
  .entry-note { color: var(--ink-dim); font-style: italic; flex: 1; min-width: 0; }
  .entry-delete {
    background: none;
    border: none;
    color: var(--ink-faint);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
    margin-left: auto;
    font-family: inherit;
  }
  .entry-delete:hover { color: var(--love); }
</style>
