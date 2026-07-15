<script lang="ts">
  import { tick } from 'svelte';
  import {
    givingEntries,
    givingThisYear,
    givingTargetAnnual,
    addGivingEntry,
    deleteGivingEntry,
  } from '../../stores/financial';
  import { birthdate } from '../../stores/personal';
  import { formatDOB } from '../../utils';

  let formOpen = false;
  let dateInput = formatDOB(new Date());
  let amountInput = '';
  let recipientInput = '';
  let amountEl: HTMLInputElement | null = null;
  let formError = '';
  let showAllEntries = false;

  $: list = $givingEntries;
  $: thisYearTotal = $givingThisYear;
  $: target = $givingTargetAnnual;
  $: hasTarget = target > 0;
  // Show this year's gifts in the recent list, since past-year gifts are
  // still in storage but contextually less relevant for the running total.
  $: thisYearList = list.filter((e) => e.date.startsWith(String(new Date().getFullYear())));
  $: visibleList = showAllEntries ? thisYearList : thisYearList.slice(0, 5);

  $: progressPct = target > 0
    ? Math.max(0, Math.min(100, Math.round((thisYearTotal / target) * 100)))
    : 0;

  $: today = formatDOB(new Date());
  $: earliestDate = $birthdate ? formatDOB($birthdate) : '1900-01-01';

  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  async function openForm() {
    formError = '';
    formOpen = true;
    dateInput = formatDOB(new Date());
    amountInput = '';
    recipientInput = '';
    await tick();
    amountEl?.focus();
  }

  function closeForm() {
    formOpen = false;
    formError = '';
  }

  function submit() {
    const amount = parseFloat(amountInput.replace(/[$,\s]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      formError = 'Enter a positive amount.';
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      formError = 'Pick a valid date.';
      return;
    }
    addGivingEntry({
      date: dateInput,
      amount,
      ...(recipientInput.trim() ? { recipient: recipientInput.trim() } : {}),
    });
    closeForm();
  }

  function handleDelete(date: string, recipient?: string) {
    const recLabel = recipient ? ` to ${recipient}` : '';
    if (!confirm(`Delete the gift from ${date}${recLabel}?`)) return;
    deleteGivingEntry(date, recipient);
  }
</script>

<section class="module-section">
  <header>
    <div class="eyebrow">GIVING</div>
    <h2>What you're giving back</h2>
  </header>

  {#if !hasTarget}
    <p class="empty-prose">
      Log some income in the budget above to unlock the giving tracker. The
      annual target is 10% of your income — that anchor only makes sense once
      there's a number to anchor to.
    </p>
  {:else}
    <div class="progress-block">
      <div class="progress-line">
        <span class="progress-amount">{fmt.format(thisYearTotal)}</span>
        <span class="progress-of">of {fmt.format(target)} goal</span>
      </div>
      <div class="progress-sub">10% of income · {new Date().getFullYear()}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progressPct}%"></div>
      </div>
    </div>

    {#if !formOpen}
      <div class="actions">
        <button class="btn primary" type="button" on:click={openForm}>+ Log a gift</button>
      </div>
    {/if}

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
              placeholder="100"
              required
            />
          </label>
        </div>
        <label class="field full">
          <span>Recipient (optional)</span>
          <input
            type="text"
            bind:value={recipientInput}
            placeholder="e.g. local food bank"
            maxlength={80}
          />
        </label>
        {#if formError}
          <div class="form-error" role="alert">{formError}</div>
        {/if}
        <div class="form-actions">
          <button class="btn ghost" type="button" on:click={closeForm}>Cancel</button>
          <button class="btn primary" type="submit">Save gift</button>
        </div>
      </form>
    {/if}

    {#if thisYearList.length > 0}
      <div class="entries">
        <div class="entries-head">
          <span class="entries-label">This year's gifts</span>
          {#if thisYearList.length > 5}
            <button class="link-btn" type="button" on:click={() => (showAllEntries = !showAllEntries)}>
              {showAllEntries ? 'Show fewer' : `Show all (${thisYearList.length})`}
            </button>
          {/if}
        </div>
        <ul>
          {#each visibleList as e (e.date + '|' + (e.recipient ?? ''))}
            <li>
              <span class="entry-date">{e.date}</span>
              <span class="entry-amount">{fmt.format(e.amount)}</span>
              {#if e.recipient}
                <span class="entry-recipient">{e.recipient}</span>
              {/if}
              <button
                class="entry-delete"
                type="button"
                aria-label="Delete gift from {e.date}"
                on:click={() => handleDelete(e.date, e.recipient)}
              >×</button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</section>

<style>
  header { margin-bottom: 16px; }
  .eyebrow {
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    margin-bottom: 6px;
  }
  h2 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin: 0;
    color: var(--ink);
  }
  .empty-prose {
    color: var(--ink-dim);
    font-size: 14px;
    line-height: 1.55;
    margin: 0;
    max-width: 540px;
  }

  .progress-block { margin-bottom: 18px; }
  .progress-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .progress-amount {
    font-size: 28px;
    font-weight: 800;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .progress-of {
    font-size: 14px;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .progress-sub {
    font-size: 12px;
    color: var(--ink-faint);
    margin-top: 2px;
    margin-bottom: 10px;
  }
  .progress-bar {
    height: 8px;
    background: var(--panel-warm);
    border-radius: 999px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--future-3));
    transition: width 0.3s ease;
  }

  .actions { margin: 4px 0 0; }

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
    background: color-mix(in srgb, var(--love) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--love) 30%, transparent);
    border-radius: var(--radius-xs);
    padding: 8px 12px;
  }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; }

  .entries { margin-top: 18px; }
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
  .entry-amount { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ink); min-width: 80px; }
  .entry-recipient { color: var(--ink-dim); font-style: italic; flex: 1; min-width: 0; }
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
