<script lang="ts">
  // Monthly cash flow — income and expense log with a category breakdown
  // and a 6-month income/expense mini chart (hand-rolled SVG, per the
  // no-chart-library rule). Giving is tracked separately (GivingSection)
  // and deliberately excluded from expense categories.
  import { tick } from 'svelte';
  import { slide } from 'svelte/transition';
  import {
    cashflowEntries,
    addCashflowEntry,
    deleteCashflowEntry,
    CASHFLOW_CATEGORIES,
    monthKey,
    summarizeMonth,
    expensesByCategory,
    lastMonths,
  } from '../../stores/financial';
  import { motionDuration } from '../../lib/motion';
  import { formatDOB } from '../../utils';
  import type { CashflowKind } from '../../types';

  // Form state
  let formOpen = false;
  let kindInput: CashflowKind = 'expense';
  let amountInput = '';
  let categoryInput = '';
  let dateInput = formatDOB(new Date());
  let noteInput = '';
  let amountEl: HTMLInputElement | null = null;
  let formError = '';
  let showAllEntries = false;

  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  $: thisMonth = monthKey(formatDOB(new Date()));
  $: summary = summarizeMonth($cashflowEntries, thisMonth);
  $: categories = expensesByCategory($cashflowEntries, thisMonth);
  $: maxCategory = categories.length > 0 ? categories[0].total : 0;

  $: monthEntries = $cashflowEntries.filter((e) => monthKey(e.date) === thisMonth);
  $: visibleEntries = showAllEntries ? monthEntries : monthEntries.slice(0, 8);

  // 6-month history for the mini chart, oldest first.
  $: history = lastMonths(thisMonth, 6).map((m) => ({
    month: m,
    label: new Date(`${m}-15`).toLocaleDateString(undefined, { month: 'narrow' }),
    ...summarizeMonth($cashflowEntries, m),
  }));
  $: chartMax = Math.max(1, ...history.map((h) => Math.max(h.income, h.expenses)));
  $: hasHistory = history.some((h) => h.income > 0 || h.expenses > 0);

  function fmtSigned(n: number): string {
    return (n >= 0 ? '+' : '−') + fmt.format(Math.abs(n));
  }

  function monthName(m: string): string {
    return new Date(`${m}-15`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  async function openForm(kind: CashflowKind) {
    formOpen = true;
    kindInput = kind;
    categoryInput = '';
    amountInput = '';
    noteInput = '';
    dateInput = formatDOB(new Date());
    formError = '';
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
    if (!categoryInput) {
      formError = 'Pick a category.';
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      formError = 'Pick a valid date.';
      return;
    }
    addCashflowEntry({
      date: dateInput,
      amount,
      kind: kindInput,
      category: categoryInput,
      ...(noteInput.trim() ? { note: noteInput.trim() } : {}),
    });
    closeForm();
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete this ${label} entry?`)) return;
    deleteCashflowEntry(id);
  }
</script>

<section class="module-section">
  <header>
    <div class="eyebrow">CASH FLOW · {monthName(thisMonth)}</div>
    {#if summary.income > 0 || summary.expenses > 0}
      <h2 class:negative={summary.net < 0}>{fmtSigned(summary.net)}</h2>
      <div class="meta">
        <span class="in">{fmt.format(summary.income)} in</span>
        <span class="dot">·</span>
        <span class="out">{fmt.format(summary.expenses)} out</span>
      </div>
    {:else}
      <h2>Cash flow</h2>
      <p class="empty-prose">
        Log income and spending to see where each month actually goes. Charitable giving
        has its own tracker below.
      </p>
    {/if}
  </header>

  {#if hasHistory}
    <div class="chart" role="img" aria-label="Income and expenses over the last 6 months">
      {#each history as h (h.month)}
        <div class="chart-month" title="{monthName(h.month)}: {fmt.format(h.income)} in, {fmt.format(h.expenses)} out">
          <div class="bars">
            <div class="bar income" style="height: {Math.max(h.income > 0 ? 4 : 0, (h.income / chartMax) * 64)}px"></div>
            <div class="bar expense" style="height: {Math.max(h.expenses > 0 ? 4 : 0, (h.expenses / chartMax) * 64)}px"></div>
          </div>
          <div class="chart-label" class:current={h.month === thisMonth}>{h.label}</div>
        </div>
      {/each}
      <div class="chart-legend">
        <span><i class="swatch income"></i>in</span>
        <span><i class="swatch expense"></i>out</span>
      </div>
    </div>
  {/if}

  {#if categories.length > 0}
    <div class="breakdown">
      <div class="breakdown-label">Where it went this month</div>
      {#each categories as c (c.category)}
        <div class="cat-row">
          <span class="cat-name">{c.category}</span>
          <div class="cat-bar-track">
            <div class="cat-bar" style="width: {(c.total / maxCategory) * 100}%"></div>
          </div>
          <span class="cat-amount">{fmt.format(c.total)}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if !formOpen}
    <div class="actions">
      <button class="btn primary" type="button" on:click={() => openForm('expense')}>
        + Log spending
      </button>
      <button class="btn ghost" type="button" on:click={() => openForm('income')}>
        + Log income
      </button>
    </div>
  {:else}
    <form class="form" transition:slide|local={{ duration: motionDuration(180) }} on:submit|preventDefault={submit}>
      <div class="kind-toggle" role="radiogroup" aria-label="Entry type">
        <button
          type="button"
          class:active={kindInput === 'expense'}
          on:click={() => { kindInput = 'expense'; categoryInput = ''; }}
        >Expense</button>
        <button
          type="button"
          class:active={kindInput === 'income'}
          on:click={() => { kindInput = 'income'; categoryInput = ''; }}
        >Income</button>
      </div>
      <div class="form-row">
        <label class="field">
          <span>Amount (USD)</span>
          <input
            type="text"
            inputmode="decimal"
            bind:value={amountInput}
            bind:this={amountEl}
            placeholder="120"
            required
          />
        </label>
        <label class="field">
          <span>Category</span>
          <select bind:value={categoryInput} required>
            <option value="" disabled>— pick one —</option>
            {#each CASHFLOW_CATEGORIES[kindInput] as c}
              <option value={c}>{c}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="form-row">
        <label class="field">
          <span>Date</span>
          <input type="date" bind:value={dateInput} max={formatDOB(new Date())} required />
        </label>
        <label class="field">
          <span>Note (optional)</span>
          <input type="text" bind:value={noteInput} placeholder="What was it?" maxlength={80} />
        </label>
      </div>
      {#if formError}
        <div class="form-error" role="alert">{formError}</div>
      {/if}
      <div class="form-actions">
        <button class="btn ghost" type="button" on:click={closeForm}>Cancel</button>
        <button class="btn primary" type="submit">
          Log {kindInput === 'income' ? 'income' : 'spending'}
        </button>
      </div>
    </form>
  {/if}

  {#if monthEntries.length > 0}
    <div class="entries">
      <div class="entries-head">
        <span class="entries-label">This month</span>
        {#if monthEntries.length > 8}
          <button class="link-btn" type="button" on:click={() => (showAllEntries = !showAllEntries)}>
            {showAllEntries ? 'Show fewer' : `Show all (${monthEntries.length})`}
          </button>
        {/if}
      </div>
      <ul>
        {#each visibleEntries as e (e.id)}
          <li transition:slide|local={{ duration: motionDuration(150) }}>
            <span class="entry-date">{e.date.slice(5)}</span>
            <span class="entry-cat">{e.category}</span>
            {#if e.note}<span class="entry-note">{e.note}</span>{/if}
            <span class="entry-amount" class:income={e.kind === 'income'}>
              {e.kind === 'income' ? '+' : '−'}{fmt.format(e.amount)}
            </span>
            <button
              class="entry-delete"
              type="button"
              aria-label="Delete {e.category} entry from {e.date}"
              on:click={() => handleDelete(e.id, e.kind)}
            >×</button>
          </li>
        {/each}
      </ul>
    </div>
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
    font-size: 34px;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 0 0 4px;
    color: var(--health);
    font-variant-numeric: tabular-nums;
  }
  h2.negative { color: var(--love); }
  .meta {
    font-size: 13px;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
    display: flex;
    gap: 8px;
  }
  .meta .in { color: var(--health); font-weight: 600; }
  .meta .out { color: var(--ink-dim); font-weight: 600; }
  .dot { color: var(--ink-faint); }
  .empty-prose {
    color: var(--ink-dim);
    font-size: 15px;
    line-height: 1.55;
    margin: 8px 0 0;
    max-width: 540px;
  }

  /* 6-month mini chart */
  .chart {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    padding: 12px 4px 6px;
    margin-bottom: 16px;
    position: relative;
  }
  .chart-month { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .bars { display: flex; align-items: flex-end; gap: 3px; height: 64px; }
  .bar { width: 9px; border-radius: 3px 3px 0 0; }
  .bar.income { background: var(--health); }
  .bar.expense { background: var(--accent-soft); }
  .chart-label {
    font-size: 10px;
    color: var(--ink-faint);
    font-weight: 700;
    text-transform: uppercase;
  }
  .chart-label.current { color: var(--accent); }
  .chart-legend {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 10px;
    font-size: 10px;
    color: var(--ink-faint);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .chart-legend span { display: inline-flex; align-items: center; gap: 4px; }
  .swatch { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .swatch.income { background: var(--health); }
  .swatch.expense { background: var(--accent-soft); }

  /* Category breakdown */
  .breakdown { margin-bottom: 16px; }
  .breakdown-label {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .cat-row {
    display: grid;
    grid-template-columns: 110px 1fr 80px;
    align-items: center;
    gap: 10px;
    padding: 3px 0;
  }
  .cat-name { font-size: 13px; color: var(--ink); font-weight: 600; }
  .cat-bar-track {
    height: 8px;
    background: var(--panel-warm);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }
  .cat-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-soft));
    border-radius: var(--radius-pill);
    transition: width 0.3s ease;
  }
  .cat-amount {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .actions { display: flex; gap: 8px; }

  .form {
    margin-top: 4px;
    padding: 16px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .kind-toggle {
    display: inline-flex;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 3px;
    align-self: flex-start;
  }
  .kind-toggle button {
    border: none;
    background: transparent;
    padding: 6px 16px;
    border-radius: var(--radius-pill);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-dim);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .kind-toggle button.active {
    background: var(--ink);
    color: var(--bg-1);
  }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) {
    .form-row { grid-template-columns: 1fr; }
    .cat-row { grid-template-columns: 90px 1fr 74px; }
  }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field span {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .field input,
  .field select {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--panel);
  }
  .field input:focus,
  .field select:focus {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
    border-color: var(--accent);
  }
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
    margin-bottom: 6px;
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
    padding: 7px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .entries li:last-child { border-bottom: none; }
  .entry-date { color: var(--ink-dim); font-variant-numeric: tabular-nums; min-width: 44px; }
  .entry-cat { font-weight: 600; color: var(--ink); min-width: 90px; }
  .entry-note { color: var(--ink-dim); font-style: italic; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .entry-amount {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    margin-left: auto;
  }
  .entry-amount.income { color: var(--health); }
  .entry-delete {
    background: none;
    border: none;
    color: var(--ink-faint);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
    font-family: inherit;
  }
  .entry-delete:hover { color: var(--love); }
</style>
