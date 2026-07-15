<script lang="ts">
  import { tick } from 'svelte';
  import {
    savingsGoals,
    cashflowEntries,
    addGoal,
    updateGoal,
    deleteGoal,
    actualSavingsRate,
    savedTowardGoal,
    monthKey,
    SAVINGS_CATEGORY,
  } from '../../stores/financial';
  import { birthdate } from '../../stores/personal';
  import { formatDOB } from '../../utils';
  import type { SavingsGoal } from '../../types';

  // ---- Actual savings rate ----
  // Computed from the cash-flow log (trailing 3 months with data), not
  // self-reported — the budget above is the source of truth.
  $: rate = actualSavingsRate($cashflowEntries, monthKey(formatDOB(new Date())));

  // ---- Goal ----
  // v1 surfaces the first goal in the list. Progress = dollars logged to
  // the Savings category since the goal was created ("pay yourself first"
  // transfers in the budget above).
  $: goal = $savingsGoals[0] ?? null;
  $: savedAmount = goal ? savedTowardGoal($cashflowEntries, goal.createdAt) : 0;
  $: progressPct = goal && goal.target > 0
    ? Math.max(0, Math.min(100, Math.round((savedAmount / goal.target) * 100)))
    : 0;

  let goalFormOpen = false;
  let editingGoalId: string | null = null;
  let goalLabelInput = '';
  let goalTargetInput = '';
  let goalDeadlineInput = '';
  let goalLabelEl: HTMLInputElement | null = null;
  let goalError = '';

  $: today = formatDOB(new Date());
  // Allow up to 30 years in the future for deadlines.
  $: maxDeadline = (() => {
    const t = new Date();
    t.setFullYear(t.getFullYear() + 30);
    return formatDOB(t);
  })();
  $: minDeadline = $birthdate ? today : '1900-01-01';

  async function openGoalFormForCreate() {
    goalFormOpen = true;
    editingGoalId = null;
    goalLabelInput = '';
    goalTargetInput = '';
    goalDeadlineInput = '';
    goalError = '';
    await tick();
    goalLabelEl?.focus();
  }

  async function openGoalFormForEdit(g: SavingsGoal) {
    goalFormOpen = true;
    editingGoalId = g.id;
    goalLabelInput = g.label;
    goalTargetInput = String(g.target);
    goalDeadlineInput = g.deadline ?? '';
    goalError = '';
    await tick();
    goalLabelEl?.focus();
  }

  function closeGoalForm() {
    goalFormOpen = false;
    editingGoalId = null;
    goalError = '';
  }

  function submitGoal() {
    const label = goalLabelInput.trim();
    if (!label) {
      goalError = 'Give your goal a name.';
      return;
    }
    const target = parseFloat(goalTargetInput.replace(/[$,\s]/g, ''));
    if (!Number.isFinite(target) || target <= 0) {
      goalError = 'Enter a positive target amount.';
      return;
    }
    if (editingGoalId) {
      updateGoal(editingGoalId, {
        label,
        target,
        ...(goalDeadlineInput ? { deadline: goalDeadlineInput } : { deadline: undefined }),
      });
    } else {
      addGoal({
        label,
        target,
        ...(goalDeadlineInput ? { deadline: goalDeadlineInput } : {}),
      });
    }
    closeGoalForm();
  }

  function handleDeleteGoal() {
    if (!goal) return;
    if (!confirm(`Delete the "${goal.label}" goal?`)) return;
    deleteGoal(goal.id);
  }

  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
</script>

<section class="module-section">
  <header>
    <div class="eyebrow">SAVINGS</div>
    <h2>What you're putting away</h2>
  </header>

  <!-- Actual savings rate, from the budget log -->
  <div class="rate-row">
    <div class="rate-label">Savings rate</div>
    <span class="rate-value" class:negative={rate !== null && rate < 0}>
      {rate !== null ? `${rate}%` : '—'}
    </span>
  </div>
  <p class="rate-prose">
    {#if rate !== null}
      Computed from your last three months of logged cash flow: what's left of income
      after expenses. Small increases compound.
    {:else}
      Log income in the budget above and this becomes your real, computed rate —
      what's actually left after expenses.
    {/if}
  </p>

  <!-- Goal -->
  <div class="goal-block">
    {#if goal && !goalFormOpen}
      <div class="goal-card">
        <div class="goal-head">
          <div>
            <div class="goal-label">{goal.label}</div>
            {#if goal.deadline}
              <div class="goal-deadline">by {goal.deadline}</div>
            {/if}
          </div>
          <div class="goal-actions">
            <button class="link-btn" type="button" on:click={() => openGoalFormForEdit(goal)}>edit</button>
            <button class="link-btn delete" type="button" on:click={handleDeleteGoal}>delete</button>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progressPct}%"></div>
        </div>
        <div class="progress-meta">
          <span>{fmt.format(savedAmount)} / {fmt.format(goal.target)}</span>
          <span>{progressPct}%</span>
        </div>
        {#if savedAmount === 0}
          <div class="hint">
            Log transfers under the "{SAVINGS_CATEGORY}" category in the budget above —
            they fill this bar.
          </div>
        {/if}
      </div>
    {:else if !goalFormOpen}
      <button class="add-goal" type="button" on:click={openGoalFormForCreate}>
        + Add a savings goal
      </button>
    {/if}

    {#if goalFormOpen}
      <form class="form" on:submit|preventDefault={submitGoal}>
        <label class="field">
          <span>Goal name</span>
          <input
            type="text"
            bind:value={goalLabelInput}
            bind:this={goalLabelEl}
            placeholder="e.g. Emergency fund"
            maxlength={60}
            required
          />
        </label>
        <div class="form-row">
          <label class="field">
            <span>Target (USD)</span>
            <input
              type="text"
              inputmode="decimal"
              bind:value={goalTargetInput}
              placeholder="50000"
              required
            />
          </label>
          <label class="field">
            <span>Deadline (optional)</span>
            <input
              type="date"
              bind:value={goalDeadlineInput}
              min={minDeadline}
              max={maxDeadline}
            />
          </label>
        </div>
        {#if goalError}
          <div class="form-error" role="alert">{goalError}</div>
        {/if}
        <div class="form-actions">
          <button class="btn ghost" type="button" on:click={closeGoalForm}>Cancel</button>
          <button class="btn primary" type="submit">{editingGoalId ? 'Update goal' : 'Save goal'}</button>
        </div>
      </form>
    {/if}
  </div>
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

  .rate-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 6px;
  }
  .rate-label {
    font-size: 14px;
    color: var(--ink-dim);
  }
  .rate-value {
    font-size: 28px;
    font-weight: 800;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .rate-value.negative { color: var(--love); }
  .rate-prose {
    color: var(--ink-dim);
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 18px;
    max-width: 500px;
  }

  .goal-block { margin-top: 12px; }
  .goal-card {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
  }
  .goal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
  }
  .goal-label {
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
  }
  .goal-deadline {
    font-size: 12px;
    color: var(--ink-faint);
    margin-top: 2px;
  }
  .goal-actions { display: flex; gap: 10px; }
  .progress-bar {
    height: 8px;
    background: var(--panel);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--future-3));
    transition: width 0.3s ease;
  }
  .progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--ink-dim);
  }
  .progress-meta span:last-child { font-weight: 700; color: var(--ink); }
  .hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--ink-faint);
    font-style: italic;
  }

  .add-goal {
    display: block;
    width: 100%;
    padding: 12px 16px;
    background: var(--panel-warm);
    border: 1px dashed var(--border);
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-dim);
    transition: all 0.15s;
  }
  .add-goal:hover { border-color: var(--accent); color: var(--accent); }

  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .link-btn:hover { text-decoration: underline; }
  .link-btn.delete { color: var(--love); }

  .form {
    margin-top: 12px;
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
</style>
