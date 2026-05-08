<script lang="ts">
  import { tick } from 'svelte';
  import {
    savingsGoals,
    savingsRate,
    latestNetWorth,
    addGoal,
    updateGoal,
    deleteGoal,
    setSavingsRate,
  } from '../../stores/financial';
  import { birthdate } from '../../stores/personal';
  import { formatDOB } from '../../utils';
  import type { SavingsGoal } from '../../types';

  // ---- Savings rate ----
  let editingRate = false;
  let rateInput = '';
  let rateEl: HTMLInputElement | null = null;

  async function openRate() {
    rateInput = String($savingsRate);
    editingRate = true;
    await tick();
    rateEl?.select();
  }

  function saveRate() {
    const n = parseFloat(rateInput);
    if (!Number.isFinite(n)) {
      editingRate = false;
      return;
    }
    setSavingsRate(n);
    editingRate = false;
  }

  function cancelRate() {
    editingRate = false;
  }

  // ---- Goal ----
  // v1 surfaces the first goal in the list. The store supports many but the
  // UI is single-goal for simplicity.
  $: goal = $savingsGoals[0] ?? null;
  $: latestAmount = $latestNetWorth?.amount ?? 0;
  $: progressPct = goal && goal.target > 0
    ? Math.max(0, Math.min(100, Math.round((latestAmount / goal.target) * 100)))
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

<section class="savings-section">
  <header>
    <div class="eyebrow">SAVINGS</div>
    <h2>What you're putting away</h2>
  </header>

  <!-- Savings rate -->
  <div class="rate-row">
    <div class="rate-label">Savings rate</div>
    {#if editingRate}
      <input
        type="number"
        min="0"
        max="100"
        step="1"
        bind:value={rateInput}
        bind:this={rateEl}
        on:blur={saveRate}
        on:keydown={(e) => { if (e.key === 'Enter') saveRate(); if (e.key === 'Escape') cancelRate(); }}
        class="rate-input"
      />
      <span class="rate-suffix">%</span>
    {:else}
      <button class="rate-value" type="button" on:click={openRate}>
        {$savingsRate}%
        <span class="rate-edit-hint">edit</span>
      </button>
    {/if}
  </div>
  <p class="rate-prose">
    The portion of your income you set aside each month. The trend matters more than the level — small increases compound.
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
          <span>{fmt.format(latestAmount)} / {fmt.format(goal.target)}</span>
          <span>{progressPct}%</span>
        </div>
        {#if latestAmount === 0}
          <div class="hint">Add a net-worth check-in above to see your progress.</div>
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
  .savings-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 22px 26px;
    box-shadow: var(--shadow-sm);
  }
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
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 28px;
    font-weight: 800;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    padding: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
  }
  .rate-edit-hint {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .rate-input {
    font-size: 28px;
    font-weight: 800;
    width: 80px;
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--panel-warm);
    font-family: inherit;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .rate-input:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  .rate-suffix {
    font-size: 22px;
    font-weight: 700;
    color: var(--ink-dim);
  }
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
    background: rgba(255, 107, 157, 0.08);
    border: 1px solid rgba(255, 107, 157, 0.3);
    border-radius: 8px;
    padding: 8px 12px;
  }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
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
  }
  .btn.primary:hover { opacity: 0.92; }
  .btn.ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-dim);
  }
  .btn.ghost:hover { color: var(--ink); border-color: var(--ink-dim); }
</style>
